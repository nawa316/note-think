import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Note from "@/lib/models/Note";

// GET /api/notes — list all notes for current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const userId = (session.user as { id: string }).id;
  const notes = await Note.find({ userId })
    .select("title thumbnail createdAt updatedAt")
    .sort({ updatedAt: -1 });

  return NextResponse.json(notes);
}

// POST /api/notes — create a new note
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const userId = (session.user as { id: string }).id;
  const body = await req.json();

  const note = await Note.create({
    userId,
    title: body.title || "Untitled Note",
    strokes: [],
    thumbnail: "",
    canvasWidth: body.canvasWidth || 1920,
    canvasHeight: body.canvasHeight || 1080,
  });

  return NextResponse.json(note, { status: 201 });
}
