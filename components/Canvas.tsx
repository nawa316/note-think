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

// Minimum pressure threshold to reject accidental palm touches
const PALM_PRESSURE_THRESHOLD = 0.03;
// S Pen side button bitmask (buttons === 32)
const SPEN_ERASER_BUTTON = 32;

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
  const isPenActive = useRef(false); // track if S Pen is hovering/drawing
  const [penDetected, setPenDetected] = useState(false);

  // Redraw all strokes on canvas
  const redraw = useCallback(
    (extraStroke?: { points: Point[]; color: string; width: number; tool: Tool }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid lines (like paper)
      ctx.strokeStyle = "#e8e8f0";
      ctx.lineWidth = 0.5;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      const allStrokes = extraStroke
        ? [...strokes, extraStroke]
        : strokes;

      for (const stroke of allStrokes) {
        if (stroke.points.length < 2) continue;
        drawStroke(ctx, stroke);
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

    // Smooth path with quadratic bezier
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let i = 1; i < stroke.points.length - 1; i++) {
      const p = stroke.points[i];
      const pNext = stroke.points[i + 1];
      const pressure = p.pressure || 0.5;

      // Pressure affects line width
      ctx.lineWidth = stroke.tool === "eraser"
        ? stroke.width
        : stroke.width * (0.5 + pressure * 0.8);

      const midX = (p.x + pNext.x) / 2;
      const midY = (p.y + pNext.y) / 2;
      ctx.quadraticCurveTo(p.x, p.y, midX, midY);
    }

    // Last point
    const last = stroke.points[stroke.points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    ctx.restore();
  }

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Resize canvas to fill container
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
    // Always allow S Pen (pointerType === 'pen')
    if (e.pointerType === "pen") return false;

    // If S Pen is hovering/active on canvas, reject touch events (palm rejection)
    if (e.pointerType === "touch" && isPenActive.current) return true;

    // Reject mouse with very low pressure (shouldn't happen, but safety net)
    if (e.pointerType === "touch" && e.pressure < PALM_PRESSURE_THRESHOLD) return true;

    return false;
  }

  function getActiveTool(e: PointerEvent): Tool {
    // S Pen side button held = eraser mode
    if (e.buttons === SPEN_ERASER_BUTTON || e.buttons & SPEN_ERASER_BUTTON) {
      return "eraser";
    }
    return tool;
  }

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (shouldReject(e)) return;

      if (e.pointerType === "pen") {
        isPenActive.current = true;
        setPenDetected(true);
      }

      canvasRef.current?.setPointerCapture(e.pointerId);
      isDrawing.current = true;
      currentStroke.current = [getCanvasPoint(e)];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (e.pointerType === "pen") isPenActive.current = true;
      if (!isDrawing.current) return;
      if (shouldReject(e)) return;

      const point = getCanvasPoint(e);
      currentStroke.current.push(point);

      const activeTool = getActiveTool(e);
      redraw({
        points: currentStroke.current,
        color,
        width: activeTool === "eraser" ? eraseWidth : penWidth,
        tool: activeTool,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool, color, penWidth, eraseWidth, redraw]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (!isDrawing.current) return;
      isDrawing.current = false;

      if (e.pointerType === "pen") isPenActive.current = false;

      if (currentStroke.current.length < 2) {
        currentStroke.current = [];
        return;
      }

      const activeTool = getActiveTool(e);
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
    [tool, color, penWidth, eraseWidth, strokes, onStrokesChange]
  );

  // Attach pointer events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);

    // Prevent context menu on long press (important for S Pen button)
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
      {/* S Pen detected badge */}
      {penDetected && (
        <div className="absolute top-3 right-3 z-10 bg-indigo-600 text-white text-xs px-3 py-1 rounded-full shadow flex items-center gap-1">
          <span>✦</span> S Pen Active
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none cursor-crosshair"
        style={{ touchAction: "none" }}
      />
    </div>
  );
}
