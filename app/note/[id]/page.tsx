"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Canvas, { Stroke, Tool } from "@/components/Canvas";
import Toolbar from "@/components/Toolbar";

const AUTOSAVE_DELAY = 3000; // ms

export default function NotePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // Note state
  const [title, setTitle] = useState("Untitled Note");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving">("saved");

  // Drawing state
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#000000");
  const [penWidth, setPenWidth] = useState(3);
  const [eraseWidth, setEraseWidth] = useState(20);

  // Undo/redo history
  const history = useRef<Stroke[][]>([[]]);
  const historyIndex = useRef(0);

  // Autosave timer
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load note from API
  useEffect(() => {
    fetch(`/api/notes/${id}`)
      .then((r) => {
        if (r.status === 404) { router.push("/dashboard"); return null; }
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setTitle(data.title);
        const loaded: Stroke[] = data.strokes || [];
        setStrokes(loaded);
        history.current = [loaded];
        historyIndex.current = 0;
        setLoading(false);
        setSaveStatus("saved");
      })
      .catch(() => router.push("/dashboard"));
  }, [id, router]);

  // Generate thumbnail from canvas
  const generateThumbnail = useCallback((): string => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return "";
    // Downscale to 400×225 thumbnail
    const thumb = document.createElement("canvas");
    thumb.width = 400;
    thumb.height = 225;
    const ctx = thumb.getContext("2d");
    if (!ctx) return "";
    ctx.drawImage(canvas, 0, 0, 400, 225);
    return thumb.toDataURL("image/jpeg", 0.7);
  }, []);

  // Save to API
  const save = useCallback(
    async (strokesToSave: Stroke[], silent = false) => {
      if (!silent) setIsSaving(true);
      setSaveStatus("saving");

      const thumbnail = generateThumbnail();

      try {
        await fetch(`/api/notes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            strokes: strokesToSave,
            thumbnail,
            canvasWidth: 1920,
            canvasHeight: 1080,
          }),
        });
        setSaveStatus("saved");
      } catch {
        setSaveStatus("unsaved");
      } finally {
        if (!silent) setIsSaving(false);
      }
    },
    [id, title, generateThumbnail]
  );

  // Handle strokes change with undo history
  const handleStrokesChange = useCallback(
    (newStrokes: Stroke[]) => {
      setStrokes(newStrokes);
      setSaveStatus("unsaved");

      // Trim redo future if we drew something new
      history.current = history.current.slice(0, historyIndex.current + 1);
      history.current.push(newStrokes);
      historyIndex.current = history.current.length - 1;

      // Schedule autosave
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        save(newStrokes, true);
      }, AUTOSAVE_DELAY);
    },
    [save]
  );

  // Undo
  const undo = useCallback(() => {
    if (historyIndex.current <= 0) return;
    historyIndex.current -= 1;
    const prev = history.current[historyIndex.current];
    setStrokes(prev);
    setSaveStatus("unsaved");
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => save(prev, true), AUTOSAVE_DELAY);
  }, [save]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex.current >= history.current.length - 1) return;
    historyIndex.current += 1;
    const next = history.current[historyIndex.current];
    setStrokes(next);
    setSaveStatus("unsaved");
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => save(next, true), AUTOSAVE_DELAY);
  }, [save]);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    if (!confirm("Clear all strokes?")) return;
    const empty: Stroke[] = [];
    setStrokes(empty);
    history.current = history.current.slice(0, historyIndex.current + 1);
    history.current.push(empty);
    historyIndex.current = history.current.length - 1;
    setSaveStatus("unsaved");
  }, []);

  // Save title changes with debounce
  useEffect(() => {
    if (loading) return;
    setSaveStatus("unsaved");
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => save(strokes, true), AUTOSAVE_DELAY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        save(strokes);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [undo, redo, save, strokes]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center animate-pulse">
            <span className="text-2xl">✒️</span>
          </div>
          <p>Loading note…</p>
        </div>
      </div>
    );
  }

  const canUndo = historyIndex.current > 0;
  const canRedo = historyIndex.current < history.current.length - 1;

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-white z-10 shrink-0">
        <Link
          href="/dashboard"
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
          title="Back to dashboard"
        >
          ←
        </Link>

        {/* Editable title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 text-lg font-semibold text-gray-900 bg-transparent border-0 outline-none focus:bg-gray-50 rounded-xl px-2 py-1 min-w-0"
          placeholder="Note title…"
          maxLength={100}
        />

        {/* Save status */}
        <div className="flex items-center gap-2 shrink-0">
          {saveStatus === "saving" && (
            <span className="text-xs text-indigo-500 animate-pulse">Saving…</span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-emerald-500">✓ Saved</span>
          )}
          {saveStatus === "unsaved" && (
            <span className="text-xs text-amber-500">● Unsaved</span>
          )}
          <button
            onClick={() => save(strokes)}
            disabled={isSaving || saveStatus === "saved"}
            className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-1.5 rounded-xl transition-colors"
          >
            Save
          </button>
        </div>
      </header>

      {/* Editor area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        <Toolbar
          tool={tool}
          onToolChange={setTool}
          color={color}
          onColorChange={setColor}
          penWidth={penWidth}
          onPenWidthChange={setPenWidth}
          eraseWidth={eraseWidth}
          onEraseWidthChange={setEraseWidth}
          onUndo={undo}
          onRedo={redo}
          onClear={clearCanvas}
          canUndo={canUndo}
          canRedo={canRedo}
          isSaving={isSaving}
          onSave={() => save(strokes)}
        />

        {/* Canvas */}
        <div className="flex-1 overflow-hidden relative">
          <Canvas
            strokes={strokes}
            onStrokesChange={handleStrokesChange}
            tool={tool}
            color={color}
            penWidth={penWidth}
            eraseWidth={eraseWidth}
          />
        </div>
      </div>

      {/* Bottom S Pen hint bar (mobile) */}
      <div className="sm:hidden shrink-0 bg-indigo-50 border-t border-indigo-100 px-4 py-2 flex items-center justify-center gap-2 text-xs text-indigo-600">
        <span>✦</span>
        <span>Use S Pen to draw · Side button = Eraser · Palm rejection active</span>
      </div>
    </div>
  );
}
