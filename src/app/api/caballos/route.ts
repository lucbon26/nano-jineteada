import { NextRequest, NextResponse } from "next/server";
import { supaAnon, tables } from "@/lib/supa";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sedeId = url.searchParams.get("sedeId");
  const categoriaId = url.searchParams.get("categoriaId");
  if (!sedeId || !categoriaId) return NextResponse.json({ error: "sedeId y categoriaId requeridos" }, { status: 400 });
  const supa = supaAnon();
  const { data, error } = await supa
    .from(tables.horsesCat)
    .select("orden, nombre, tropilla")
    .eq("sede_id", sedeId).eq("categoria_id", categoriaId).eq("estado", "activo")
    .order("orden");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
