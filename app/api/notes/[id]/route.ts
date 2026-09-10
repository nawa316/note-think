import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Note from "@/lib/models/Note";

type Params = { params: { id: string } };

// GET /api/notes/[id] — fetch single note with all strokes
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const userId = (session.user as { id: string }).id;

  const note = await Note.findOne({ _id: params.id, userId });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json(note);
}

// PUT /api/notes/[id] — save/update strokes & title
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const userId = (session.user as { id: string }).id;

  const body = await req.json();

  const note = await Note.findOneAndUpdate(
    { _id: params.id, userId },
    {
      $set: {
        title: body.title,
        strokes: body.strokes,
        thumbnail: body.thumbnail || "",
        canvasWidth: body.canvasWidth,
        canvasHeight: body.canvasHeight,
      },
    },
    { new: true }
  );

  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json(note);
}

// DELETE /api/notes/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const userId = (session.user as { id: string }).id;

  const note = await Note.findOneAndDelete({ _id: params.id, userId });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Note deleted" });
}
