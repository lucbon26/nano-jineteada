import { NextRequest, NextResponse } from "next/server";
import { supaAnon, tables } from "@/lib/supa";

/**
 * /api/sedes
 * - Siempre devuelve JSON
 * - No usa ORDER BY en la DB (evitamos fallar si no existe 'id')
 * - Normaliza campos: id | sede_id | uuid, ciudad | nombre | localidad, fecha | dia | event_date
 * - Ordena en memoria por ciudad (fallback id)
 */
export async function GET(_req: NextRequest) {
  try {
    const supa = supaAnon();
    const { data, error } = await supa.from(tables.sedes).select("*");
    if (error) {
      console.error("DB sedes error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data || []).map((s: any) => ({
      id: String(s.id ?? s.sede_id ?? s.uuid ?? ""),
      ciudad: s.ciudad ?? s.nombre ?? s.localidad ?? null,
      fecha: s.fecha ?? s.dia ?? s.event_date ?? null,
      _raw: s,
    }));

    // quita las que no tengan id
    const filtered = rows.filter(r => r.id);

    // ordena por ciudad (o por id si no hay ciudad)
    filtered.sort((a, b) => {
      const A = (a.ciudad ?? a.id ?? "").toString().toLowerCase();
      const B = (b.ciudad ?? b.id ?? "").toString().toLowerCase();
      return A.localeCompare(B);
    });

    return NextResponse.json({ data: filtered });
  } catch (e: any) {
    console.error("API sedes exception:", e);
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
