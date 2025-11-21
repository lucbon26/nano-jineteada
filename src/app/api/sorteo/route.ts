import { NextRequest, NextResponse } from "next/server";
import { supaAnon, supaService, tables } from "@/lib/supa";

function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Persiste SOLO jinete_id. Calcula nombre para la UI sin guardar.
 */
export async function POST(req: NextRequest) {
  try {
    const { sedeId, categoriaId, excluirIds } = await req.json();
    if (!sedeId || !categoriaId) {
      return NextResponse.json({ error: "sedeId y categoriaId requeridos" }, { status: 400 });
    }

    const anon = supaAnon();

    // Trae jinetes con columnas reales
    const { data: ins, error: e1 } = await anon
      .from(tables.jinetes)
      .select("id, nombre, apellido")
      .eq("categoria_id", categoriaId)
      .order("id");
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

    let jinetes = (ins || []).filter((x: any) => !(excluirIds || []).includes(String(x.id)));
    if (!jinetes.length) return NextResponse.json({ error: "No hay jinetes para sortear" }, { status: 400 });

    const { data: cabs, error: e2 } = await anon
      .from(tables.horsesCat)
      .select("orden, nombre, tropilla")
      .eq("sede_id", sedeId)
      .eq("categoria_id", categoriaId)
      .eq("estado", "activo")
      .order("orden");
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
    if (!cabs?.length) return NextResponse.json({ error: "No hay caballos cargados para esta sede/categoría" }, { status: 400 });

    jinetes = shuffle(jinetes);
    const rows = jinetes.map((j: any, idx: number) => {
      const cab = cabs[idx % cabs.length] as any;
      const jinete_nombre = [j.nombre, j.apellido].filter(Boolean).join(" ") || String(j.id);
      return {
        orden: idx + 1,
        jinete_id: String(j.id),
        jinete_nombre,
        caballo_nombre: cab.nombre,
        tropilla: cab.tropilla || null,
      };
    });

    const svc = supaService();
    const { data: sorteo, error: e3 } = await svc
      .from(tables.sorteos)
      .insert({ sede_id: sedeId, categoria_id: categoriaId })
      .select()
      .single();
    if (e3) return NextResponse.json({ error: e3.message }, { status: 500 });

    const emp = rows.map(r => ({
      sorteo_id: sorteo.id,
      orden: r.orden,
      jinete_id: r.jinete_id,
      caballo_nombre: r.caballo_nombre,
      tropilla: r.tropilla,
    }));
    const { error: e4 } = await svc.from(tables.emparejamientos).insert(emp);
    if (e4) return NextResponse.json({ error: e4.message }, { status: 500 });

    return NextResponse.json({ ok: true, sorteoId: sorteo.id, rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
