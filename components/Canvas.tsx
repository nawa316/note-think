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

const PALM_PRESSURE_THRESHOLD = 0.03;

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
  const isPenActive = useRef(false);

  // ─── S Pen barrel button state ────────────────────────────────────────────
  // Tracked as a ref (not state) so handlers always see the latest value
  // without needing to be re-created.
  //
  // Samsung S Pen barrel button can appear as:
  //   • e.button === 5  (barrel button index — most reliable on Samsung)
  //   • (e.buttons & 32) !== 0  (bitmask — W3C spec)
  // We track press/release separately so pointerup still knows it was eraser.
  const barrelPressed = useRef(false);

  const [penDetected, setPenDetected] = useState(false);
  const [eraserActive, setEraserActive] = useState(false); // UI indicator

  // ─── Determine active tool ────────────────────────────────────────────────
  // Called on every pointer event. Uses barrelPressed ref so it's correct
  // even on pointerup (where e.buttons is already 0).
  const getActiveTool = useCallback(
    (e: PointerEvent): Tool => {
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

  // ─── Canvas drawing ───────────────────────────────────────────────────────
  const redraw = useCallback(
    (extraStroke?: { points: Point[]; color: string; width: number; tool: Tool }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid
      ctx.strokeStyle = "#e8e8f0";
      ctx.lineWidth = 0.5;
      const gs = 40;
      for (let x = 0; x < canvas.width; x += gs) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gs) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      const all = extraStroke ? [...strokes, extraStroke] : strokes;
      for (const s of all) {
        if (s.points.length < 2) continue;
        drawStroke(ctx, s);
      }
    },
    [strokes]
  );

  function drawStroke(
    ctx: CanvasRenderingContext2D,
    stroke: { points: Point[]; color: string; width: number; tool: Tool }
  ) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else if (stroke.tool === "marker") {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.4;
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
          : stroke.width * (0.5 + (p.pressure || 0.5) * 0.8);
      const midX = (p.x + pNext.x) / 2;
      const midY = (p.y + pNext.y) / 2;
      ctx.quadraticCurveTo(p.x, p.y, midX, midY);
    }
    const last = stroke.points[stroke.points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    ctx.restore();
  }

  useEffect(() => { redraw(); }, [redraw]);

  // Resize observer
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

  function getCanvasPoint(e: PointerEvent): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5,
    };
  }

  function shouldReject(e: PointerEvent): boolean {
    if (e.pointerType === "pen") return false;
    if (e.pointerType === "touch" && isPenActive.current) return true;
    if (e.pointerType === "touch" && e.pressure < PALM_PRESSURE_THRESHOLD) return true;
    return false;
  }

  // ─── Pointer event handlers ───────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (shouldReject(e)) return;

      if (e.pointerType === "pen") {
        isPenActive.current = true;
        setPenDetected(true);

        // Detect barrel button on press (button index 5)
        if (e.button === 5 || (e.buttons & 32) !== 0) {
          barrelPressed.current = true;
          setEraserActive(true);
        }
      }

      canvasRef.current?.setPointerCapture(e.pointerId);
      isDrawing.current = true;
      currentStroke.current = [getCanvasPoint(e)];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (e.pointerType === "pen") {
        isPenActive.current = true;
        // Keep barrel state in sync during move (some devices only report in move)
        if ((e.buttons & 32) !== 0) {
          barrelPressed.current = true;
          setEraserActive(true);
        }
      }
      if (!isDrawing.current) return;
      if (shouldReject(e)) return;

      currentStroke.current.push(getCanvasPoint(e));

      const activeTool = getActiveTool(e);
      redraw({
        points: currentStroke.current,
        color,
        width: activeTool === "eraser" ? eraseWidth : penWidth,
        tool: activeTool,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool, color, penWidth, eraseWidth, redraw, getActiveTool]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      // Commit stroke using the barrelPressed ref (NOT e.buttons which is 0 on up)
      const activeTool = getActiveTool(e);

      if (e.pointerType === "pen") {
        isPenActive.current = false;
        // Release barrel button if it was the button that went up (button index 5)
        if (e.button === 5) {
          barrelPressed.current = false;
          setEraserActive(false);
        }
      }

      if (!isDrawing.current) return;
      isDrawing.current = false;

      if (currentStroke.current.length < 2) {
        currentStroke.current = [];
        return;
      }

      const newStroke: Stroke = {
        points: currentStroke.current,
        color,
        width: activeTool === "eraser" ? eraseWidth : penWidth,
        tool: activeTool,
        timestamp: Date.now(),
      };

      onStrokesChange([...strokes, newStroke]);
      currentStroke.current = [];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool, color, penWidth, eraseWidth, strokes, onStrokesChange, getActiveTool]
  );

  // ─── Also track barrel button via pointercancel & global pointerup ────────
  // Some Samsung devices fire pointercancel when barrel button is released
  const handleGlobalPointerUp = useCallback((e: PointerEvent) => {
    if (e.button === 5 || (e.buttons & 32) === 0) {
      if (barrelPressed.current) {
        barrelPressed.current = false;
        setEraserActive(false);
      }
    }
  }, []);

  // Attach events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // Track barrel button release globally (in case it fires outside canvas)
    window.addEventListener("pointerup", handleGlobalPointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("pointerup", handleGlobalPointerUp);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp, handleGlobalPointerUp]);

  return (
    <div className="relative w-full h-full">
      {/* Status badges */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 items-end">
        {penDetected && !eraserActive && (
          <div className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-full shadow flex items-center gap-1">
            <span>✦</span> S Pen
          </div>
        )}
        {eraserActive && (
          <div className="bg-rose-500 text-white text-xs px-3 py-1 rounded-full shadow flex items-center gap-1 animate-pulse">
            <span>⬜</span> Eraser (Button)
          </div>
        )}
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none cursor-crosshair"
        style={{ touchAction: "none" }}
      />
    </div>
  );
}
