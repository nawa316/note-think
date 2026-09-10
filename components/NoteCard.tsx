"use client";

import Link from "next/link";

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
  const date = new Date(note.updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
      {/* Thumbnail */}
      <Link href={`/note/${note._id}`} className="block">
        <div className="h-40 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center overflow-hidden">
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
        </div>
      </Link>

      {/* Info */}
      <div className="p-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/note/${note._id}`}>
            <p className="font-semibold text-gray-800 truncate hover:text-indigo-600 transition-colors">
              {note.title || "Untitled Note"}
            </p>
          </Link>
          <p className="text-xs text-gray-400 mt-0.5">{date}</p>
        </div>
        <button
          onClick={() => onDelete(note._id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 shrink-0 p-1 rounded-lg hover:bg-red-50"
          title="Delete note"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
