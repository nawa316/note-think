"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import NoteCard from "@/components/NoteCard";

interface Note {
  id: string;
  title: string;
  thumbnail: string;
  updated_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    // Get user info and notes on mount
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      setUserName(data.user.user_metadata?.name || data.user.email || "");
    });

    fetch("/api/notes")
      .then((r) => r.json())
      .then((data) => {
        setNotes(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [router]);

  const createNote = async () => {
    setCreating(true);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled Note" }),
    });
    const note = await res.json();
    setCreating(false);
    router.push(`/note/${note.id}`);
  };

  const deleteNote = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <span className="text-lg">✒️</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              note<span className="text-indigo-600">-think</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {userName && (
              <span className="text-sm text-gray-500 hidden sm:block">
                👋 {userName}
              </span>
            )}
            <button
              onClick={signOut}
              className="text-sm text-gray-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">My Notes</h2>
          <button
            onClick={createNote}
            disabled={creating}
            className="flex items-center gap-2 bg-indigo-600 text-white font-semibold px-5 py-2.5 rounded-2xl hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-60"
          >
            <span className="text-lg">+</span>
            {creating ? "Creating…" : "New Note"}
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-52 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-6xl mb-4">📝</span>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No notes yet</h3>
            <p className="text-gray-400 mb-6">Pick up your S Pen and start writing!</p>
            <button
              onClick={createNote}
              className="bg-indigo-600 text-white font-semibold px-6 py-3 rounded-2xl hover:bg-indigo-700 transition-colors shadow-md"
            >
              Create Your First Note
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={{ _id: note.id, title: note.title, thumbnail: note.thumbnail, updatedAt: note.updated_at }}
                onDelete={deleteNote}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
