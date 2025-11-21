import { NextResponse } from "next/server";
import { supaAnon, tables } from "@/lib/supa";

export async function GET() {
  try {
    const supa = supaAnon();
    const { data: cats, error: e1 } = await supa
      .from(tables.categorias)
      .select("id, nombre")
      .order("id");
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

    const { data: jins, error: e2 } = await supa
      .from(tables.jinetes)
      .select("id, categoria_id");
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

    const counts = new Map<string, number>();
    (jins || []).forEach((j: any) => {
      const k = String(j.categoria_id);
      counts.set(k, (counts.get(k) || 0) + 1);
    });

    const out = (cats || []).map((c: any) => ({
      id: c.id,
      nombre: c.nombre ?? String(c.id),
      count: counts.get(String(c.id)) ?? 0,
    }));

    return NextResponse.json({ ok: true, data: out });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
