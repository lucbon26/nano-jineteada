import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { supaAnon, tables } from "../../..//lib/supa";
import logoUrl from "../../../../media/logo.png";
import banderaUrl from "../../../../media/bandera.png";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const pad2 = (n: number) => String(n).padStart(2, "0");
function nowAR() {
  const d = new Date();
  const dd = pad2(d.getDate()), mm = pad2(d.getMonth() + 1), yyyy = d.getFullYear();
  const hh = pad2(d.getHours()), nn = pad2(d.getMinutes());
  const tz = -d.getTimezoneOffset() / 60;
  return `${dd}/${mm}/${yyyy} , ${hh}:${nn} GMT${tz >= 0 ? "+" : ""}${tz}`;
}
function toBase64(u8: Uint8Array): string {
  let bin = ""; for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  // @ts-ignore
  return btoa(bin);
}
async function fetchAsDataURL(base: string, urlOrPath: string, mime = "image/png"): Promise<string | null> {
  const abs = urlOrPath.startsWith("http") ? urlOrPath : `${base}${urlOrPath}`;
  try {
    const r = await fetch(abs); if (!r.ok) return null;
    const ab = await r.arrayBuffer();
    return `data:${mime};base64,${toBase64(new Uint8Array(ab))}`;
  } catch { return null; }
}

type RowIn = {
  orden?: number | string;
  palenque?: string;
  jinete?: string;
  localidad?: string;
  caballo?: string;
  tropilla?: string;
  puntos?: string;
  observaciones?: string;

  jinete_id?: string | number;
};

async function buildPdf(rowsIn: RowIn[], url: URL) {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36 });
  const chunks: Uint8Array[] = [];
  // @ts-ignore
  doc.on("data", (c: any) => chunks.push(c));
  const done: Promise<Uint8Array> = new Promise((resolve) => {
    doc.on("end", () => {
      let total = 0; for (const c of chunks) total += c.length;
      const out = new Uint8Array(total); let off = 0;
      for (const c of chunks) { out.set(c, off); off += c.length; }
      resolve(out);
    });
  });

  // Logos
  {
    const base = url.origin || "http://localhost:3000";
    const logoDataUrl = await fetchAsDataURL(base, (logoUrl as any).src ?? (logoUrl as any) ?? (logoUrl as any));
    const banderaDataUrl = await fetchAsDataURL(base, (banderaUrl as any).src ?? (banderaUrl as any) ?? (banderaUrl as any));
    const y = doc.y, h = 28;
    if (logoDataUrl) doc.image(logoDataUrl, doc.page.margins.left, y, { height: h });
    if (banderaDataUrl) {
      const xRight = doc.page.width - doc.page.margins.right - 60;
      doc.image(banderaDataUrl, xRight, y, { height: h });
    }
    doc.moveDown(0.2);
  }
// === Leer la categoría seleccionada, tal como el selector de /admin/preparar ===

const supa = supaAnon();

// === Leer la categoría seleccionada, tal como el selector de /admin/preparar ===
/*const { data: categoriaRow, error: catErr } = await supa
  .from("categorias") // misma tabla que usa el selector
  .select("id, nombre")
  .eq("id", categoriaId)
  .maybeSingle();

if (catErr) console.warn("Error leyendo categoría:", catErr.message);

const categoriaNombre = categoriaRow?.nombre ?? "";
const { data: categoriaRow, error: catErr } = await supa
  .from("categorias") // <- misma tabla que usa el selector
  .select("id, nombre")
  .eq("id", categoriaId)
  .maybeSingle();

if (catErr) console.warn("Error leyendo categoría:", catErr.message);

const categoriaNombre = categoriaRow?.nombre ?? "";*/
  // Encabezado



  doc.font("Helvetica-Bold").fontSize(26).text("Campeonato Rionegrino de Jineteada", { align: "center" });
  doc.moveDown(0.2);
  doc.font("Helvetica-Bold").fontSize(26).text("Sergio Herrera", { align: "center" });
  doc.moveDown(0.2);
 //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

  //doc.font("Helvetica").fontSize(16).text("Clasificatorio rumbo a Jesús María 2026 - GURUPA", { align: "center" });
  //doc.font("Helvetica").fontSize(16).text("Clasificatorio rumbo a Jesús María 2026 - CLINA", { align: "center" });
  doc.font("Helvetica").fontSize(16).text("Clasificatorio rumbo a Jesús María 2026 - BASTOS", { align: "center" });

 //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

  
  //doc.font("Helvetica").fontSize(26).text("Campeonato Rionegrino de Jineteada", { align: "center" });
  //doc.moveDown(0.2);
 // const sub = "Clasificatorio rumbo a Jesús María 2026" + (categoriaNombre ? ` – ${categoriaNombre}` : "");
 // doc.font("Helvetica").fontSize(14).text(sub, { align: "center" });
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(10).text(`Generado: ${nowAR()}`, { align: "center" });
  doc.moveDown(0.8);

  const headers = ["#", "Palenque", "Jinete", "Localidad", "Caballo", "Tropilla", "Puntos", "Observaciones"];
  const rows: string[][] = (rowsIn || []).map((r, i) => [
    String(r.orden ?? i + 1).padStart(2, "0"),
    String(r.palenque ?? ((i % 3) + 1)),
    String(r.jinete ?? "-"),
    String(r.localidad ?? "-"),
    String(r.caballo ?? "-"),
    String(r.tropilla ?? "-"),
    String(r.puntos ?? ""),
    String(r.observaciones ?? ""),
  ]);

  if (!rows.length) {
    doc.moveDown(1);
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#b00")
      .text("No hay emparejamientos para imprimir.", { align: "center" });
    doc.end();
    return await done;
  }

  // Cálculo de anchos y render de tabla
  const fontBody = "Helvetica", fontHeader = "Helvetica-Bold";
  const sizeHeader = 10, sizeBody = 8, padH = 8;
  const n = headers.length;
  const natural: number[] = Array(n).fill(0);
  const measure = (t: any, head = false) => {
    const s = t == null ? "" : String(t);
    doc.font(head ? fontHeader : fontBody).fontSize(head ? sizeHeader : sizeBody);
    return doc.widthOfString(s) + padH;
  };
  for (let c = 0; c < n; c++) natural[c] = Math.max(natural[c], measure(headers[c], true));
  rows.forEach(cols => { for (let c = 0; c < n; c++) natural[c] = Math.max(natural[c], measure(cols[c], false)); });
  const MIN = { num: 40, palenque: 60, localidad: 120, puntos: 60, obs: 120 };
  natural[0] = Math.max(natural[0], MIN.num);
  natural[1] = Math.max(natural[1], MIN.palenque);
  natural[3] = Math.max(natural[3], MIN.localidad);
  natural[6] = Math.max(natural[6], MIN.puntos);
  natural[7] = Math.max(natural[7], MIN.obs);

  const contentW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const sum = natural.reduce((a, b) => a + b, 0);
  let widths = natural.map(w => Math.max(28, w * (contentW / sum)));
  const diff = contentW - widths.reduce((a, b) => a + b, 0);
  if (Math.abs(diff) > 0.1) widths[widths.length - 1] += diff;

  const startX = doc.x;
  let currentY = doc.y;
  const COLOR = { border: "#444", headerBg: "#f0f0f0", zebra: "#fafafa", text: "#000" };

  const drawHeader = () => {
    const rowH = 24;
    let x = startX;
    for (let i = 0; i < n; i++) {
      doc.save().rect(x, currentY, widths[i], rowH).fill(COLOR.headerBg).restore();
      doc.lineWidth(0.6).strokeColor(COLOR.border).rect(x, currentY, widths[i], rowH).stroke();
      const align = (i === 0 || i === 1 || i === 6) ? "center" : "left";
      const pad = align === "left" ? 8 : 4;
      doc.fillColor(COLOR.text).font(fontHeader).fontSize(sizeHeader)
         .text(headers[i], x + pad, currentY + 6, { width: widths[i] - pad * 2, align });
      x += widths[i];
    }
    currentY += rowH;
  };

  const drawRow = (values: any[], idx: number) => {
    const rowH = 22;
    let x = startX;
    if (idx % 2 === 1) {
      doc.save().rect(x, currentY, widths.reduce((a, b) => a + b, 0), rowH).fill(COLOR.zebra).restore();
    }
    for (let i = 0; i < n; i++) {
      doc.lineWidth(0.5).strokeColor(COLOR.border).rect(x, currentY, widths[i], rowH).stroke();
      const align = (i === 0 || i === 1 || i === 6) ? "center" : "left";
      const pad = align === "left" ? 8 : 4;
      doc.fillColor(COLOR.text).font(fontBody).fontSize(sizeBody)
         .text(String(values[i] ?? ""), x + pad, currentY + 6, { width: widths[i] - pad * 2, align });
      x += widths[i];
    }
    currentY += rowH;
    const bottomLimit = doc.page.height - doc.page.margins.bottom - 40;
    if (currentY > bottomLimit) {
      doc.addPage({ size: "A4", layout: "landscape", margin: 36 });
      currentY = doc.y;
      drawHeader();
    }
  };

  drawHeader();
  rows.forEach((r, i) => drawRow(r, i));

  doc.end();
  return await done;
}

// POST: usa las filas de la UI (sin tocar DB)
export async function POST(req: NextRequest) {
  try {
    const url = req.nextUrl ?? new URL(req.url, "http://localhost:3000");
    const ct = req.headers.get("content-type") || "";
    let json: any = null;
    if (ct.includes("application/json")) {
      json = await req.json();
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const body = await req.text();
      const usp = new URLSearchParams(body);
      const raw = usp.get("rows") || "[]";
      json = { rows: JSON.parse(raw) };
    } else {
      json = await req.json().catch(() => ({}));
    }
    const rows: RowIn[] = Array.isArray(json?.rows) ? json.rows : [];
    if (!rows.length)
 return NextResponse.json({ error: "No llegaron filas para imprimir" }, { status: 400 });

    /*ENRICH_LOCALIDAD*/
    try {
      const ids = Array.from(new Set(rows.map(r => r.jinete_id).filter(Boolean).map(String)));
      if (ids.length) {
        const supa = supaAnon();
        const { data: js } = await supa
          .from(tables.jinetes)
          .select("id, localidad")
          .in("id", ids);
        const locMap = new Map((js || []).map((j:any)=>[String(j.id), j.localidad || "-"]));
        rows.forEach(r => {
          if (!r.localidad || r.localidad === "-") {
            const k = r.jinete_id != null ? String(r.jinete_id) : null;
            if (k && locMap.has(k)) r.localidad = locMap.get(k) as string;
          }
        });
      }
    } catch {}
    const pdfU8 = await buildPdf(rows, url);
    return new NextResponse(pdfU8, {
      status: 200,
      headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline; filename=sorteo.pdf" }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error generando PDF" }, { status: 500 });
  }
}

// GET: fallback (tu comportamiento previo con DB)
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl ?? new URL(req.url, "http://localhost:3000");
    const sedeId = url.searchParams.get("sedeId") ?? url.searchParams.get("sedeld");
    const categoriaId = url.searchParams.get("categoriaId") ?? url.searchParams.get("categoria");
    const sorteoId = url.searchParams.get("sorteoId");

    if (!sedeId || !categoriaId) {
      const pdfU8 = await buildPdf([], url);
      return new NextResponse(pdfU8, { status: 200, headers: { "Content-Type": "application/pdf" } });
    }

    const supa = supaAnon();
    let selSorteoId: string | null = null;
    if (sorteoId && sorteoId.trim()) selSorteoId = sorteoId.trim();
    else {
      const { data: last } = await supa
        .from(tables.sorteos)
        .select("id")
        .eq("sede_id", sedeId)
        .eq("categoria_id", categoriaId)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      selSorteoId = last?.id ?? null;
    }

    if (!selSorteoId) {
      const pdfU8 = await buildPdf([], url);
      return new NextResponse(pdfU8, { status: 200, headers: { "Content-Type": "application/pdf" } });
    }

    const { data: emp } = await supa
      .from(tables.emparejamientos)
      .select("orden, jinete_id, caballo_nombre, tropilla")
      .eq("sorteo_id", selSorteoId)
      .order("orden", { ascending: true });

    const ids = Array.from(new Set((emp || []).map((r: any) => r.jinete_id).filter(Boolean)));
    const nombres = new Map<string, string>();
    const localidades = new Map<string, string>();
    if (ids.length) {
      const { data: js } = await supa
        .from(tables.jinetes)
        .select("id, nombre, apellido, localidad")
        .in("id", ids);
      (js || []).forEach((j: any) => {
        const nm = [j.nombre, j.apellido].filter(Boolean).join(" ").trim() || String(j.id);
        nombres.set(String(j.id), nm);
        if (j.localidad) localidades.set(String(j.id), String(j.localidad));
      });
    }

    const rows: RowIn[] = (emp || []).map((r: any, i: number) => ({
      orden: r.orden ?? i + 1,
      palenque: String((i % 3) + 1),
      jinete: nombres.get(String(r.jinete_id)) || String(r.jinete_id || "-"),
      localidad: localidades.get(String(r.jinete_id)) || "-",
      caballo: r.caballo_nombre || "-",
      tropilla: r.tropilla || "-",
      puntos: "",
      observaciones: "",
    }));

    /*ENRICH_LOCALIDAD*/
    try {
      const ids = Array.from(new Set(rows.map(r => r.jinete_id).filter(Boolean).map(String)));
      if (ids.length) {
        const supa = supaAnon();
        const { data: js } = await supa
          .from(tables.jinetes)
          .select("id, localidad")
          .in("id", ids);
        const locMap = new Map((js || []).map((j:any)=>[String(j.id), j.localidad || "-"]));
        rows.forEach(r => {
          if (!r.localidad || r.localidad === "-") {
            const k = r.jinete_id != null ? String(r.jinete_id) : null;
            if (k && locMap.has(k)) r.localidad = locMap.get(k) as string;
          }
        });
      }
    } catch {}
    const pdfU8 = await buildPdf(rows, url);
    return new NextResponse(pdfU8, {
      status: 200,
      headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline; filename=sorteo.pdf" }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error generando PDF" }, { status: 500 });
  }
}
