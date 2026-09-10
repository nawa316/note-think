import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createSupabaseServerClient } from "@/lib/supabase-server";

type Params = { params: Promise<{ id: string }> };

// GET /api/notes/[id] — fetch single note with all strokes
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PUT /api/notes/[id] — save strokes, title, thumbnail
export async function PUT(req: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("notes")
    .update({
      title: body.title,
      strokes: body.strokes,
      thumbnail: body.thumbnail || "",
      canvas_width: body.canvasWidth,
      canvas_height: body.canvasHeight,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

// DELETE /api/notes/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Note deleted" });
}
