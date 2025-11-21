import { NextRequest, NextResponse } from "next/server";
import { supaService, tables } from "@/lib/supa";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const sedeId = form.get("sedeId") as string | null;
  const categoriaId = form.get("categoriaId") as string | null;
  if (!file) return NextResponse.json({ error: "Archivo .xlsx requerido" }, { status: 400 });
  if (!sedeId || !categoriaId) return NextResponse.json({ error: "sedeId y categoriaId requeridos" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const payload = rows.map((r, idx) => ({
    sede_id: sedeId,
    categoria_id: categoriaId,
    nombre: String(r.caballo || r.Caballo || r.CABALLO || "").trim(),
    tropilla: String(r.tropilla || r.Tropilla || r.TROPILLA || "").trim() || null,
    orden: idx + 1,
    estado: "activo",
  })).filter(x => x.nombre);

  if (payload.length === 0) return NextResponse.json({ error: "No se encontraron filas válidas (columna 'caballo')" }, { status: 400 });

  const supa = supaService();
  await supa.from(tables.horsesCat).delete().eq("sede_id", sedeId).eq("categoria_id", categoriaId);
  const { error } = await supa.from(tables.horsesCat).insert(payload);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, count: payload.length });
}
