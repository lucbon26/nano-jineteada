import { NextResponse } from "next/server";
import { supaAnon, tables } from "@/lib/supa";

export async function GET() {
  const supa = supaAnon();
  const { data, error } = await supa.from(tables.categorias).select("id, nombre").order("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
