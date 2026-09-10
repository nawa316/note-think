"use client";

import Link from "next/link";
import { useRef, useState } from "react";

interface Note {
  _id: string;
  title: string;
  thumbnail: string;
  updatedAt: string;
}

interface NoteCardProps {
  note: Note;
  onDelete: (id: string) => void;
}

export default function NoteCard({ note, onDelete }: NoteCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const date = new Date(note.updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Long-press on thumbnail → show delete confirmation (mobile UX)
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setConfirmDelete(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirmDelete) {
      onDelete(note._id);
    } else {
      setConfirmDelete(true);
      // Auto-cancel after 3s if user doesn't tap again
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDelete(false);
  };

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
      {/* Thumbnail */}
      <Link
        href={`/note/${note._id}`}
        className="block"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
      >
        <div className="h-40 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center overflow-hidden relative">
          {note.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={note.thumbnail}
              alt={note.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-5xl opacity-20">📝</span>
          )}

          {/* Long-press overlay hint */}
          {confirmDelete && (
            <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center backdrop-blur-sm">
              <p className="text-white text-sm font-semibold text-center px-2">
                Tap 🗑️ to delete
              </p>
            </div>
          )}
        </div>
      </Link>

      {/* Info row */}
      <div className="p-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/note/${note._id}`}>
            <p className="font-semibold text-gray-800 truncate hover:text-indigo-600 transition-colors">
              {note.title || "Untitled Note"}
            </p>
          </Link>
          <p className="text-xs text-gray-400 mt-0.5">{date}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Cancel button — shown when in confirm state */}
          {confirmDelete && (
            <button
              onClick={handleCancelDelete}
              className="text-xs text-gray-400 hover:text-gray-600 px-1.5 py-1 rounded-lg"
              title="Cancel"
            >
              ✕
            </button>
          )}

          {/* Delete button
              - Desktop: hidden, revealed on hover (group-hover)
              - Mobile: always visible but small/muted; turns red in confirm state */}
          <button
            onClick={handleDelete}
            className={`
              shrink-0 p-1.5 rounded-lg transition-all
              ${confirmDelete
                ? "text-white bg-red-500 scale-110 shadow"
                : "text-gray-300 bg-transparent hover:text-red-500 hover:bg-red-50 sm:opacity-0 sm:group-hover:opacity-100"
              }
            `}
            title={confirmDelete ? "Tap again to confirm delete" : "Delete note"}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
