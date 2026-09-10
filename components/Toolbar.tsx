"use client";

import { Tool } from "./Canvas";

interface ToolbarProps {
  tool: Tool;
  onToolChange: (t: Tool) => void;
  color: string;
  onColorChange: (c: string) => void;
  penWidth: number;
  onPenWidthChange: (w: number) => void;
  eraseWidth: number;
  onEraseWidthChange: (w: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
  onSave: () => void;
}

const PRESET_COLORS = [
  "#000000",
  "#1e3a8a",
  "#0f766e",
  "#15803d",
  "#b45309",
  "#7c3aed",
  "#be123c",
  "#374151",
  "#ef4444",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
];

export default function Toolbar({
  tool,
  onToolChange,
  color,
  onColorChange,
  penWidth,
  onPenWidthChange,
  eraseWidth,
  onEraseWidthChange,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
  isSaving,
  onSave,
}: ToolbarProps) {
  const toolBtn = (t: Tool, label: string, emoji: string) => (
    <button
      onClick={() => onToolChange(t)}
      title={label}
      className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl text-lg transition-all ${
        tool === t
          ? "bg-indigo-600 text-white shadow-md scale-105"
          : "bg-white text-gray-600 hover:bg-indigo-50 border border-gray-200"
      }`}
    >
      <span>{emoji}</span>
      <span className="text-[9px] mt-0.5 leading-none font-medium">{label}</span>
    </button>
  );

  return (
    <aside className="flex flex-col gap-3 p-3 bg-gray-50 border-r border-gray-200 w-20 min-h-full select-none">
      {/* Drawing tools */}
      <div className="flex flex-col gap-2">
        {toolBtn("pen", "Pen", "✒️")}
        {toolBtn("marker", "Marker", "🖊️")}
        {toolBtn("eraser", "Eraser", "⬜")}
      </div>

      <div className="border-t border-gray-200" />

      {/* Color palette */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[9px] text-gray-400 uppercase font-semibold tracking-wide">Color</span>
        <div className="grid grid-cols-2 gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onColorChange(c)}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                color === c ? "border-indigo-500 scale-110" : "border-transparent hover:border-gray-300"
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
        {/* Custom color picker */}
        <label className="cursor-pointer mt-1" title="Custom color">
          <span className="text-[9px] text-gray-400">Custom</span>
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-8 h-5 rounded border-0 cursor-pointer block mx-auto mt-0.5"
          />
        </label>
      </div>

      <div className="border-t border-gray-200" />

      {/* Width sliders */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[9px] text-gray-400 uppercase font-semibold tracking-wide">
          {tool === "eraser" ? "Erase" : "Width"}
        </span>
        {tool === "eraser" ? (
          <input
            type="range"
            min={5}
            max={60}
            value={eraseWidth}
            onChange={(e) => onEraseWidthChange(Number(e.target.value))}
            className="w-14 accent-indigo-600"
            style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", height: "60px" }}
          />
        ) : (
          <input
            type="range"
            min={1}
            max={20}
            value={penWidth}
            onChange={(e) => onPenWidthChange(Number(e.target.value))}
            className="w-14 accent-indigo-600"
            style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", height: "60px" }}
          />
        )}
        <span className="text-[10px] text-gray-500 font-mono">
          {tool === "eraser" ? eraseWidth : penWidth}px
        </span>
      </div>

      <div className="border-t border-gray-200" />

      {/* History */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
          className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="text-lg">↩️</span>
          <span className="text-[9px] font-medium">Undo</span>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
          className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="text-lg">↪️</span>
          <span className="text-[9px] font-medium">Redo</span>
        </button>
        <button
          onClick={onClear}
          title="Clear all"
          className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white border border-gray-200 text-red-500 hover:bg-red-50"
        >
          <span className="text-lg">🗑️</span>
          <span className="text-[9px] font-medium">Clear</span>
        </button>
      </div>

      <div className="flex-1" />

      {/* Save */}
      <button
        onClick={onSave}
        disabled={isSaving}
        title="Save note"
        className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 shadow-md"
      >
        <span className="text-lg">{isSaving ? "⏳" : "💾"}</span>
        <span className="text-[9px] font-medium">{isSaving ? "..." : "Save"}</span>
      </button>
    </aside>
  );
}
