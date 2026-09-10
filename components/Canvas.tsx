"use client";

import { useRef, useEffect, useCallback, useState } from "react";

export type Tool = "pen" | "eraser" | "marker";

export interface Point {
  x: number;
  y: number;
  pressure: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
  tool: Tool;
  timestamp: number;
}

interface CanvasProps {
  strokes: Stroke[];
  onStrokesChange: (strokes: Stroke[]) => void;
  tool: Tool;
  color: string;
  penWidth: number;
  eraseWidth: number;
  // CSS transform scale applied by parent (for correct coord mapping)
  zoom?: number;
}

export default function Canvas({
  strokes,
  onStrokesChange,
  tool,
  color,
  penWidth,
  eraseWidth,
  zoom = 1,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentStroke = useRef<Point[]>([]);
  const isDrawing = useRef(false);
  const activePointerId = useRef<number | null>(null);

  // ── Barrel / S Pen button state ──────────────────────────────────────────
  // Samsung devices fire 'contextmenu' when barrel button is pressed.
  // We use it as a toggle: first press → eraser ON; next press or new pen
  // stroke without button → eraser OFF.
  const [buttonEraserOn, setButtonEraserOn] = useState(false);
  const buttonEraserRef = useRef(false); // same value, accessible in handlers

  const [penDetected, setPenDetected] = useState(false);

  // ── Resolve active tool ──────────────────────────────────────────────────
  const resolveActiveTool = useCallback(
    (e: PointerEvent): Tool => {
      if (
        buttonEraserRef.current ||
        e.button === 5 ||
        e.button === 2 ||               // Samsung Internet simulates right-click
        (e.buttons & 32) !== 0
      ) {
        return "eraser";
      }
      return tool;
    },
    [tool]
  );

  // ── Drawing helpers ──────────────────────────────────────────────────────
  function drawStroke(
    ctx: CanvasRenderingContext2D,
    stroke: { points: Point[]; color: string; width: number; tool: Tool }
  ) {
    if (stroke.points.length < 2) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.tool === "eraser") {
      // White fill — grid is drawn AFTER so it's never erased
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#ffffff";
    } else if (stroke.tool === "marker") {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = stroke.color;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
    }

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length - 1; i++) {
      const p = stroke.points[i];
      const pNext = stroke.points[i + 1];
      ctx.lineWidth =
        stroke.tool === "eraser"
          ? stroke.width
          : stroke.width * (0.4 + (p.pressure || 0.5) * 0.9);
      const mx = (p.x + pNext.x) / 2;
      const my = (p.y + pNext.y) / 2;
      ctx.quadraticCurveTo(p.x, p.y, mx, my);
    }
    const last = stroke.points[stroke.points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    ctx.restore();
  }

  // ── Redraw — grid is drawn LAST so eraser never covers it ───────────────
  const redraw = useCallback(
    (extra?: { points: Point[]; color: string; width: number; tool: Tool }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const s of strokes) drawStroke(ctx, s);
      if (extra) drawStroke(ctx, extra);

      // Grid drawn LAST — always on top, never erasable
      ctx.save();
      ctx.strokeStyle = "#e8e8f0";
      ctx.lineWidth = 0.5;
      const gs = 40;
      for (let x = 0; x < w; x += gs) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += gs) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.restore();
    },
    [strokes]
  );

  useEffect(() => { redraw(); }, [redraw]);

  // ── Resize canvas ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      redraw();
    });
    observer.observe(canvas.parentElement!);
    return () => observer.disconnect();
  }, [redraw]);

  // ── Coordinate helper — accounts for parent CSS zoom transform ───────────
  function getPoint(e: PointerEvent): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    // offsetWidth is CSS size pre-transform; rect.width is post-transform
    // Ratio gives the inverse of the CSS zoom factor
    const scaleX = canvas.offsetWidth / rect.width;
    const scaleY = canvas.offsetHeight / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      pressure: e.pressure || 0.5,
    };
  }

  // ── S Pen button via contextmenu (works on Samsung Internet & Chrome) ────
  // contextmenu fires when the barrel button is pressed while hovering/touching
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      // Toggle eraser button mode
      const next = !buttonEraserRef.current;
      buttonEraserRef.current = next;
      setButtonEraserOn(next);
    };

    canvas.addEventListener("contextmenu", handleContextMenu);
    return () => canvas.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  // Also catch it at document level for hover presses
  useEffect(() => {
    const onDocPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "pen") return;
      if (e.button === 5 || e.button === 2 || (e.buttons & 32) !== 0) {
        buttonEraserRef.current = true;
        setButtonEraserOn(true);
      }
    };
    const onDocPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== "pen") return;
      // If no barrel bit → button was released
      if (e.button === 5 || (e.button === 2 && (e.buttons & 32) === 0)) {
        buttonEraserRef.current = false;
        setButtonEraserOn(false);
      }
    };
    document.addEventListener("pointerdown", onDocPointerDown, true);
    document.addEventListener("pointerup", onDocPointerUp, true);
    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown, true);
      document.removeEventListener("pointerup", onDocPointerUp, true);
    };
  }, []);

  // ── Pointer handlers — S Pen tip ONLY ───────────────────────────────────
  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (e.pointerType !== "pen") return;         // fingers: scroll/zoom only
      if (e.button === 5 || e.button === 2) return; // pure barrel press, no tip
      if (e.pressure === 0) return;                 // hovering, not touching
      if (activePointerId.current !== null) return;

      setPenDetected(true);
      activePointerId.current = e.pointerId;
      canvasRef.current?.setPointerCapture(e.pointerId);
      isDrawing.current = true;
      currentStroke.current = [getPoint(e)];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDrawing.current || e.pointerId !== activePointerId.current) return;

      // Update barrel from move events (some Samsung devices only report here)
      if ((e.buttons & 32) !== 0) {
        buttonEraserRef.current = true;
        setButtonEraserOn(true);
      }

      currentStroke.current.push(getPoint(e));
      const at = resolveActiveTool(e);
      redraw({
        points: currentStroke.current,
        color,
        width: at === "eraser" ? eraseWidth : penWidth,
        tool: at,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool, color, penWidth, eraseWidth, redraw, resolveActiveTool]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (e.pointerId !== activePointerId.current) return;
      activePointerId.current = null;

      if (!isDrawing.current) return;
      isDrawing.current = false;

      if (currentStroke.current.length < 2) {
        currentStroke.current = [];
        return;
      }

      const at = resolveActiveTool(e); // reads buttonEraserRef — still valid
      onStrokesChange([
        ...strokes,
        {
          points: currentStroke.current,
          color,
          width: at === "eraser" ? eraseWidth : penWidth,
          tool: at,
          timestamp: Date.now(),
        },
      ]);
      currentStroke.current = [];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool, color, penWidth, eraseWidth, strokes, onStrokesChange, resolveActiveTool]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp]);

  return (
    <div className="relative w-full h-full">
      {/* Status badges */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 items-end pointer-events-none select-none">
        {penDetected && !buttonEraserOn && (
          <div className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-full shadow flex items-center gap-1">
            <span>✦</span> S Pen
          </div>
        )}
        {buttonEraserOn && (
          <div className="bg-rose-500 text-white text-xs px-3 py-1 rounded-full shadow flex items-center gap-1 animate-pulse">
            <span>⬜</span> Eraser — tap again to cancel
          </div>
        )}
      </div>

      {/*
        touch-action: pan-x pan-y  → finger scroll & pinch work natively.
        S Pen pointer events (pointerType='pen') are NOT affected by touch-action.
      */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        style={{ touchAction: "pan-x pan-y" }}
      />
    </div>
  );
}
