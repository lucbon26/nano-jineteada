import { NextRequest, NextResponse } from "next/server";
import { supaAnon, tables } from "@/lib/supa";

export async function GET(req: NextRequest) {
  const categoriaId = new URL(req.url).searchParams.get("categoriaId");
  if (!categoriaId) return NextResponse.json({ error: "categoriaId requerido" }, { status: 400 });
  const supa = supaAnon();
  const { data, error } = await supa
    .from(tables.jinetes)
    .select("id, nombre, apellido")
    .eq("categoria_id", categoriaId)
    .order("nombre");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
