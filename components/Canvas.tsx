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
}

export default function Canvas({
  strokes,
  onStrokesChange,
  tool,
  color,
  penWidth,
  eraseWidth,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentStroke = useRef<Point[]>([]);
  const isDrawing = useRef(false);
  const isPenNearby = useRef(false);       // pen hovering/touching
  const activePointerId = useRef<number | null>(null); // only the TIP pointer

  // ── Barrel button state ──────────────────────────────────────────────────
  // Tracked at document level so we catch it during hover (before tip touch).
  // Persists into pointerup where e.buttons is already 0.
  const barrelPressed = useRef(false);

  const [penDetected, setPenDetected] = useState(false);
  const [eraserFromButton, setEraserFromButton] = useState(false);

  // ── Resolve active tool ──────────────────────────────────────────────────
  const resolveActiveTool = useCallback(
    (e: PointerEvent): Tool => {
      // Barrel button (button index 5 or bitmask bit 5)
      if (
        barrelPressed.current ||
        e.button === 5 ||
        (e.buttons & 32) !== 0
      ) {
        return "eraser";
      }
      return tool;
    },
    [tool]
  );

  // ── Draw helpers ─────────────────────────────────────────────────────────
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
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
  }, []);

  function drawStroke(
    ctx: CanvasRenderingContext2D,
    stroke: { points: Point[]; color: string; width: number; tool: Tool }
  ) {
    if (stroke.points.length < 2) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.tool === "eraser") {
      // Erase with white fill so grid (drawn after) stays intact
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
      const pressure = p.pressure || 0.5;
      ctx.lineWidth =
        stroke.tool === "eraser"
          ? stroke.width
          : stroke.width * (0.4 + pressure * 0.9);
      const midX = (p.x + pNext.x) / 2;
      const midY = (p.y + pNext.y) / 2;
      ctx.quadraticCurveTo(p.x, p.y, midX, midY);
    }
    ctx.lineTo(
      stroke.points[stroke.points.length - 1].x,
      stroke.points[stroke.points.length - 1].y
    );
    ctx.stroke();
    ctx.restore();
  }

  // ── Redraw ────────────────────────────────────────────────────────────────
  // Grid is drawn LAST so the eraser (white stroke) cannot cover it.
  const redraw = useCallback(
    (
      extraStroke?: { points: Point[]; color: string; width: number; tool: Tool }
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;

      // 1. White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. All committed strokes
      for (const s of strokes) drawStroke(ctx, s);

      // 3. Live (in-progress) stroke
      if (extraStroke) drawStroke(ctx, extraStroke);

      // 4. Grid on top — always visible, never erased
      drawGrid(ctx, w, h);
    },
    [strokes, drawGrid]
  );

  useEffect(() => { redraw(); }, [redraw]);

  // ── Resize observer ───────────────────────────────────────────────────────
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

  // ── Coordinate helper ─────────────────────────────────────────────────────
  function getPoint(e: PointerEvent): Point {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5,
    };
  }

  // ── Document-level barrel button tracker ─────────────────────────────────
  // This fires when the barrel button is pressed while HOVERING —
  // before the tip ever touches the canvas, so canvas events miss it.
  useEffect(() => {
    const onDocDown = (e: PointerEvent) => {
      if (e.pointerType !== "pen") return;
      if (e.button === 5 || (e.buttons & 32) !== 0) {
        barrelPressed.current = true;
        setEraserFromButton(true);
      }
    };
    const onDocUp = (e: PointerEvent) => {
      if (e.pointerType !== "pen") return;
      if (e.button === 5 || barrelPressed.current) {
        // Only clear if no barrel bit still held
        if ((e.buttons & 32) === 0) {
          barrelPressed.current = false;
          setEraserFromButton(false);
        }
      }
    };
    document.addEventListener("pointerdown", onDocDown, true);
    document.addEventListener("pointerup", onDocUp, true);
    return () => {
      document.removeEventListener("pointerdown", onDocDown, true);
      document.removeEventListener("pointerup", onDocUp, true);
    };
  }, []);

  // ── Canvas pointer handlers ───────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      // Only respond to S Pen tip — ignore fingers (let them scroll/pinch)
      if (e.pointerType !== "pen") return;
      // Ignore barrel-only events (no tip contact — pressure 0, button 5)
      if (e.button === 5 || (e.pressure === 0 && e.buttons === 32)) return;
      // Ignore if another pointer is already drawing
      if (activePointerId.current !== null) return;

      isPenNearby.current = true;
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
      if (e.pointerType === "pen") isPenNearby.current = true;
      if (!isDrawing.current) return;
      if (e.pointerId !== activePointerId.current) return;

      // Keep barrel state updated during move (some Samsung devices
      // only report it in move events, not in down)
      if ((e.buttons & 32) !== 0) {
        barrelPressed.current = true;
        setEraserFromButton(true);
      }

      currentStroke.current.push(getPoint(e));
      const activeTool = resolveActiveTool(e);
      redraw({
        points: currentStroke.current,
        color,
        width: activeTool === "eraser" ? eraseWidth : penWidth,
        tool: activeTool,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool, color, penWidth, eraseWidth, redraw, resolveActiveTool]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (e.pointerId !== activePointerId.current) return;
      activePointerId.current = null;

      if (e.pointerType === "pen") isPenNearby.current = false;

      if (!isDrawing.current) return;
      isDrawing.current = false;

      if (currentStroke.current.length < 2) {
        currentStroke.current = [];
        return;
      }

      // resolveActiveTool reads barrelPressed ref — still accurate on pointerup
      const activeTool = resolveActiveTool(e);
      onStrokesChange([
        ...strokes,
        {
          points: currentStroke.current,
          color,
          width: activeTool === "eraser" ? eraseWidth : penWidth,
          tool: activeTool,
          timestamp: Date.now(),
        },
      ]);
      currentStroke.current = [];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool, color, penWidth, eraseWidth, strokes, onStrokesChange, resolveActiveTool]
  );

  // ── Attach events ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    // Prevent context menu from appearing on long S Pen button press
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

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
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 items-end pointer-events-none">
        {penDetected && !eraserFromButton && (
          <div className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-full shadow flex items-center gap-1">
            <span>✦</span> S Pen
          </div>
        )}
        {eraserFromButton && (
          <div className="bg-rose-500 text-white text-xs px-3 py-1 rounded-full shadow flex items-center gap-1 animate-pulse">
            <span>⬜</span> Eraser (Button)
          </div>
        )}
      </div>

      {/*
        touch-action: pan-x pan-y  ← lets fingers scroll/pinch-zoom freely
        S Pen tip events are NOT affected by touch-action, so drawing still works.
      */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        style={{ touchAction: "pan-x pan-y" }}
      />
    </div>
  );
}
