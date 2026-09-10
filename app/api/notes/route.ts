import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createSupabaseServerClient } from "@/lib/supabase-server";

// GET /api/notes — list all notes for current user (no strokes, lightweight)
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("notes")
    .select("id, title, thumbnail, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/notes — create a new empty note
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const body = await req.json();

  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      title: body.title || "Untitled Note",
      strokes: [],
      thumbnail: "",
      canvas_width: body.canvasWidth || 1920,
      canvas_height: body.canvasHeight || 1080,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
