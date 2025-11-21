import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { supaAnon, tables } from "@/lib/supa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

// ================== Helpers de fecha ==================

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Devuelve fecha/hora en Argentina (GMT-3) sin depender
 * del huso horario del servidor.
 */
function nowAR(): string {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const ar = new Date(utcMs - 3 * 60 * 60_000); // UTC-3

  const dd = pad2(ar.getDate());
  const mm = pad2(ar.getMonth() + 1);
  const yyyy = ar.getFullYear();
  const hh = pad2(ar.getHours());
  const nn = pad2(ar.getMinutes());

  return `${dd}/${mm}/${yyyy} , ${hh}:${nn} GMT-3`;
}

// ================== Helpers de imágenes ==================

function toBase64(u8: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  // @ts-ignore
  return btoa(bin);
}

async function fetchAsDataURL(
  base: string,
  urlOrPath: string,
  mime = "image/png",
): Promise<string | null> {
  const abs = urlOrPath.startsWith("http") ? urlOrPath : `${base}${urlOrPath}`;
  try {
    const r = await fetch(abs);
    if (!r.ok) return null;
    const ab = await r.arrayBuffer();
    return `data:${mime};base64,${toBase64(new Uint8Array(ab))}`;
  } catch {
    return null;
  }
}

// ================== Tipos internos ==================

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

// ================== Armado del PDF ==================

async function buildPdf(
  rowsIn: RowIn[],
  url: URL,
  categoriaNombre?: string,
): Promise<Uint8Array> {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 36,
  });

  const chunks: Uint8Array[] = [];
  doc.on("data", (c: any) => chunks.push(c));
  const done: Promise<Uint8Array> = new Promise((resolve, reject) => {
    doc.on("end", () => {
      let total = 0;
      for (const c of chunks) total += c.length;
      const out = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) {
        out.set(c, off);
        off += c.length;
      }
      resolve(out);
    });
    doc.on("error", (err: any) => reject(err));
  });

  // ---------- Logos ----------
  try {
    const base = url.origin || "http://localhost:3000";
    // Asumimos que tenés logo y bandera en /public
    const logoDataUrl = await fetchAsDataURL(base, "/logo.png");
    const banderaDataUrl = await fetchAsDataURL(base, "/bandera.png");

    const y = doc.y;
    const h = 28;
    if (logoDataUrl) {
      doc.image(logoDataUrl, doc.page.margins.left, y, { height: h });
    }
    if (banderaDataUrl) {
      const xRight = doc.page.width - doc.page.margins.right - 60;
      doc.image(banderaDataUrl, xRight, y, { height: h });
    }
    doc.moveDown(0.2);
  } catch {
    // si falla el logo, no rompemos el PDF
  }

  // ---------- Encabezado ----------
  doc
    .font("Helvetica-Bold")
    .fontSize(26)
    .text("Campeonato Rionegrino de Jineteada", { align: "center" });
  doc
    .font("Helvetica-Bold")
    .fontSize(26)
    .text("Sergio Herrera", { align: "center" });
  doc.moveDown(0.2);

  const baseSub = "Clasificatorio rumbo a Jesús María 2026";
  const sub =
    categoriaNombre && categoriaNombre.trim().length > 0
      ? `${baseSub} - ${categoriaNombre.trim()}`
      : baseSub;

  doc.font("Helvetica").fontSize(16).text(sub, { align: "center" });

  doc.moveDown(0.5);
  doc
    .font("Helvetica")
    .fontSize(10)
    .text(`Generado: ${nowAR()}`, { align: "center" });
  doc.moveDown(0.8);

  // ---------- Tabla ----------
  const headers = [
    "#",
    "Palenque",
    "Jinete",
    "Localidad",
    "Caballo",
    "Tropilla",
    "Puntos",
    "Observaciones",
  ];
  const rows: string[][] = (rowsIn || []).map((r, i) => [
    String(r.orden ?? i + 1).padStart(2, "0"),
    String(r.palenque ?? (i % 3) + 1),
    String(r.jinete ?? "-"),
    String(r.localidad ?? "-"),
    String(r.caballo ?? "-"),
    String(r.tropilla ?? "-"),
    String(r.puntos ?? ""),
    String(r.observaciones ?? ""),
  ]);

  if (!rows.length) {
    doc.moveDown(1);
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#b00")
      .text("No hay emparejamientos para imprimir.", { align: "center" });
    doc.end();
    return await done;
  }

  const fontHeader = "Helvetica-Bold";
  const fontBody = "Helvetica";
  const sizeHeader = 10;
  const sizeBody = 8;
  const padH = 8;
  const n = headers.length;
  const natural: number[] = Array(n).fill(0);

  const measure = (t: any, head = false) => {
    const s = t == null ? "" : String(t);
    doc
      .font(head ? fontHeader : fontBody)
      .fontSize(head ? sizeHeader : sizeBody);
    return doc.widthOfString(s) + padH;
  };

  for (let c = 0; c < n; c++)
    natural[c] = Math.max(natural[c], measure(headers[c], true));
  rows.forEach((cols) => {
    for (let c = 0; c < n; c++)
      natural[c] = Math.max(natural[c], measure(cols[c], false));
  });

  const MIN = {
    num: 40,
    palenque: 60,
    localidad: 120,
    puntos: 60,
    obs: 120,
  };
  natural[0] = Math.max(natural[0], MIN.num);
  natural[1] = Math.max(natural[1], MIN.palenque);
  natural[3] = Math.max(natural[3], MIN.localidad);
  natural[6] = Math.max(natural[6], MIN.puntos);
  natural[7] = Math.max(natural[7], MIN.obs);

  const totalNatural = natural.reduce((a, b) => a + b, 0);
  const maxWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const scale = totalNatural > maxWidth ? maxWidth / totalNatural : 1;
  const widths = natural.map((w) => w * scale);

  const startX = doc.page.margins.left;
  let y = doc.y;

  const drawRow = (cols: string[], isHeader = false) => {
    const h = isHeader ? 20 : 16;
    if (y + h > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    let x = startX;
    for (let c = 0; c < headers.length; c++) {
      const w = widths[c];
      doc.rect(x, y, w, h).stroke();
      const txt = cols[c] ?? "";
      doc
        .font(isHeader ? fontHeader : fontBody)
        .fontSize(isHeader ? sizeHeader : sizeBody)
        .text(txt, x + 3, y + 3, { width: w - 6, ellipsis: true });
      x += w;
    }
    y += h;
  };

  drawRow(headers, true);
  rows.forEach((r) => drawRow(r, false));

  doc.end();
  return await done;
}

// ================== GET: genera PDF desde la BD ==================

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl ?? new URL(req.url, "http://localhost:3000");

    const sedeId =
      url.searchParams.get("sedeId") ?? url.searchParams.get("sedeld");
    const categoriaId =
      url.searchParams.get("categoriaId") ?? url.searchParams.get("categoria");
    const sorteoId = url.searchParams.get("sorteoId");

    if (!sedeId || !categoriaId) {
      const pdfU8 = await buildPdf([], url, undefined);
      return new NextResponse(pdfU8.buffer as ArrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "inline; filename=sorteo.pdf",
        },
      });
    }

    const supa = supaAnon();

    // Último sorteo de esa sede/categoría (si no se pasa sorteoId)
    let selSorteoId: string | null = null;
    if (sorteoId && sorteoId.trim()) {
      selSorteoId = sorteoId.trim();
    } else {
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

    // Nombre de la categoría para el título
    let categoriaNombre: string | undefined = undefined;
    try {
      const { data: categoriaRow, error: catErr } = await supa
        .from("categorias") // misma tabla que usa /admin/preparar
        .select("id, nombre")
        .eq("id", categoriaId)
        .maybeSingle();
      if (catErr) {
        console.warn("Error leyendo categoría:", catErr.message);
      } else {
        categoriaNombre = (categoriaRow?.nombre as string) ?? undefined;
      }
    } catch (e) {
      console.warn("Excepción leyendo categoría:", e);
    }

    if (!selSorteoId) {
      const pdfU8 = await buildPdf([], url, categoriaNombre);
return new NextResponse(pdfU8.buffer as ArrayBuffer, {
  status: 200,
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": "inline; filename=sorteo.pdf",
  },
});
    }

    // Emparejamientos del sorteo
    const { data: emp, error: empErr } = await supa
      .from(tables.emparejamientos)
      .select("orden, jinete_id, caballo_nombre, tropilla")
      .eq("sorteo_id", selSorteoId)
      .order("orden", { ascending: true });

    if (empErr) {
      console.error("Error leyendo emparejamientos:", empErr);
    }

    const ids = Array.from(
      new Set((emp || []).map((r: any) => r.jinete_id).filter(Boolean)),
    );
    const nombres = new Map<string, string>();
    const localidades = new Map<string, string>();

    if (ids.length) {
      const { data: js, error: jsErr } = await supa
        .from(tables.jinetes)
        .select("id, nombre, apellido, localidad")
        .in("id", ids);

      if (jsErr) {
        console.error("Error leyendo jinetes:", jsErr);
      } else {
        (js || []).forEach((j: any) => {
          const nm =
            [j.nombre, j.apellido].filter(Boolean).join(" ").trim() ||
            String(j.id);
          nombres.set(String(j.id), nm);
          if (j.localidad) localidades.set(String(j.id), String(j.localidad));
        });
      }
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
      jinete_id: r.jinete_id,
    }));

    const pdfU8 = await buildPdf(rows, url, categoriaNombre);
return new NextResponse(pdfU8.buffer as ArrayBuffer, {
  status: 200,
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": "inline; filename=sorteo.pdf",
  },
});
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message || "Error generando PDF" },
      { status: 500 },
    );
  }
}

// ================== POST: imprime filas enviadas manualmente ==================

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
      return NextResponse.json(
        { error: "No llegaron filas para imprimir" },
        { status: 400 },
      );

    const categoriaNombre =
      typeof json?.categoriaNombre === "string"
        ? json.categoriaNombre
        : undefined;

    // Opcional: completar localidad de jinetes por id
    try {
      const ids = Array.from(
        new Set(rows.map((r) => r.jinete_id).filter(Boolean).map(String)),
      );
      if (ids.length) {
        const supa = supaAnon();
        const { data: js } = await supa
          .from(tables.jinetes)
          .select("id, localidad")
          .in("id", ids);
        const locMap = new Map(
          (js || []).map((j: any) => [String(j.id), j.localidad || "-"]),
        );
        rows.forEach((r) => {
          if (!r.localidad || r.localidad === "-") {
            const k = r.jinete_id != null ? String(r.jinete_id) : null;
            if (k && locMap.has(k)) r.localidad = locMap.get(k) as string;
          }
        });
      }
    } catch {
      // si falla el enrich, seguimos con lo que hay
    }

    const pdfU8 = await buildPdf(rows, url, categoriaNombre);
    return new NextResponse(pdfU8, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=sorteo.pdf",
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message || "Error generando PDF" },
      { status: 500 },
    );
  }
}
