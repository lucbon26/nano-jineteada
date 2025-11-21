import { NextRequest, NextResponse } from "next/server";
// Usamos el bundle standalone de pdfkit (sin tipos TS)
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { supaAnon, tables } from "../../../../lib/supa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

/**
 * Descarga una imagen desde /public usando fetch y la devuelve como data URL.
 * Si falla, devuelve null (no rompemos el PDF).
 */
async function loadImageDataURL(origin: string, publicPath: string): Promise<string | null> {
  try {
    const url = new URL(publicPath, origin).toString();
    const res = await fetch(url);
    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/png";
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch (e) {
    console.error("Error cargando imagen para PDF:", e);
    return null;
  }
}

/**
 * Construye el PDF en memoria y devuelve un Uint8Array.
 * `rows` debe ser un array de objetos con campos:
 *  - "#"
 *  - palenque
 *  - jinete
 *  - localidad
 *  - caballo
 *  - tropilla
 *  - puntos
 *  - obs
 */
async function buildPdf(rows: any[], origin: string, categoriaTexto?: string): Promise<Uint8Array> {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36 });

  const chunks: Uint8Array[] = [];
  const done = new Promise<Uint8Array>((resolve, reject) => {
    doc.on("data", (c: Uint8Array) => chunks.push(c));
    doc.on("end", () => {
      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const merged = new Uint8Array(totalLength);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
      }
      resolve(merged);
    });
    doc.on("error", (err: unknown) => reject(err));
  });

  // === ENCABEZADO ===
  const title1 = "Campeonato Rionegrino de Jineteada";
  const title2 = "Sergio Herrera";

  doc.fontSize(22).font("Helvetica-Bold").text(title1, { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(20).font("Helvetica-Bold").text(title2, { align: "center" });

  doc.moveDown(0.8);
  const subtituloBase = "Clasificatorio rumbo a Jesús María 2026";
  const subtitulo =
    categoriaTexto && categoriaTexto.trim().length > 0
      ? `${subtituloBase} - ${categoriaTexto}`
      : subtituloBase;
  doc.fontSize(14).font("Helvetica").text(subtitulo, { align: "center" });

  doc.moveDown(0.5);
  const ahora = new Date();
  // Forzamos zona horaria de Argentina (GMT-3)
  const fechaStr = ahora.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const generadoStr = `${fechaStr} GMT-3`;
  doc.fontSize(10).text(`Generado: ${generadoStr}`, { align: "center" });

  doc.moveDown(1.2);

  // === LOGOS DESDE /public/logo.png y /public/bandera.png (opcionales) ===
  const logoDataUrl = await loadImageDataURL(origin, "/logo.png");
  const banderaDataUrl = await loadImageDataURL(origin, "/bandera.png");

  const headerY = doc.y;
  const logoHeight = 28;

  if (logoDataUrl) {
    doc.image(logoDataUrl, doc.page.margins.left, headerY, { height: logoHeight });
  }
  if (banderaDataUrl) {
    const imgWidth = 60;
    const xRight = doc.page.width - doc.page.margins.right - imgWidth;
    doc.image(banderaDataUrl, xRight, headerY, { width: imgWidth });
  }

  doc.moveDown(1.4);

  // === TABLA ===
  const startX = doc.page.margins.left;
  const startY = doc.y;

  const colDefs = [
    { key: "#", label: "#", width: 30 },
    { key: "palenque", label: "Palenque", width: 70 },
    { key: "jinete", label: "Jinete", width: 160 },
    { key: "localidad", label: "Localidad", width: 140 },
    { key: "caballo", label: "Caballo", width: 140 },
    { key: "tropilla", label: "Tropilla", width: 120 },
    { key: "puntos", label: "Puntos", width: 60 },
    { key: "obs", label: "Observaciones", width: 150 },
  ] as const;

  const rowHeight = 20;

  function drawCell(x: number, y: number, w: number, h: number, text: string, bold = false) {
    doc.rect(x, y, w, h).stroke();
    doc.save();
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9);
    const padding = 4;
    doc.text(text, x + padding, y + padding, {
      width: w - padding * 2,
      height: h - padding * 2,
      ellipsis: true,
    });
    doc.restore();
  }

  // Header de tabla
  let cursorY = startY;
  let cursorX = startX;
  for (const col of colDefs) {
    drawCell(cursorX, cursorY, col.width, rowHeight, col.label, true);
    cursorX += col.width;
  }
  cursorY += rowHeight;

  // Filas
  for (const row of rows) {
    cursorX = startX;
    const pageBottom = doc.page.height - doc.page.margins.bottom - rowHeight;
    if (cursorY > pageBottom) {
      doc.addPage();
      cursorY = doc.page.margins.top;

      // Redibujar header en nueva página
      let hx = startX;
      for (const col of colDefs) {
        drawCell(hx, cursorY, col.width, rowHeight, col.label, true);
        hx += col.width;
      }
      cursorY += rowHeight;
    }

    for (const col of colDefs) {
      const value = row[col.key] != null ? String(row[col.key]) : "";
      drawCell(cursorX, cursorY, col.width, rowHeight, value);
      cursorX += col.width;
    }
    cursorY += rowHeight;
  }

  doc.end();
  return await done;
}

/**
 * GET: usa Supabase en base a sedeId / categoriaId / categoriaNombre.
 *  - ?sedeId=...&categoriaId=...&categoriaNombre=BASTOS
 */
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl ?? new URL(req.url, "http://localhost:3000");

    // Parámetros: sede, categoría, sorteo opcional y nombre de categoría para el título
    const sedeId = url.searchParams.get("sedeId") ?? url.searchParams.get("sedeld");
    const categoriaId = url.searchParams.get("categoriaId") ?? url.searchParams.get("categoria");
    const sorteoIdParam = url.searchParams.get("sorteoId");
    const categoriaNombre = url.searchParams.get("categoriaNombre") || undefined;

    if (!sedeId || !categoriaId) {
      // No hay datos mínimos -> devolvemos PDF vacío pero válido
      const pdfU8 = await buildPdf([], url.origin, categoriaNombre);
      const arrayBuffer = pdfU8.buffer as ArrayBuffer;
      return new NextResponse(arrayBuffer as any, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "inline; filename=sorteo.pdf",
        },
      });
    }

    const supa = supaAnon();

    // 1) Determinar sorteo a usar
    let selSorteoId: string | null = null;
    if (sorteoIdParam && sorteoIdParam.trim()) {
      selSorteoId = sorteoIdParam.trim();
    } else {
      const { data: last, error: lastErr } = await supa
        .from(tables.sorteos)
        .select("id")
        .eq("sede_id", sedeId)
        .eq("categoria_id", categoriaId)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastErr) {
        console.error("Error leyendo último sorteo:", lastErr);
      }
      selSorteoId = last?.id ?? null;
    }

    if (!selSorteoId) {
      const pdfU8 = await buildPdf([], url.origin, categoriaNombre);
      const arrayBuffer = pdfU8.buffer as ArrayBuffer;
      return new NextResponse(arrayBuffer as any, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "inline; filename=sorteo.pdf",
        },
      });
    }

    // 2) Traer emparejamientos de ese sorteo
    const { data: emp, error: empErr } = await supa
      .from(tables.emparejamientos)
      .select("orden, jinete_id, caballo_nombre, tropilla")
      .eq("sorteo_id", selSorteoId)
      .order("orden", { ascending: true });

    if (empErr) {
      console.error("Error Supabase emparejamientos:", empErr);
      return NextResponse.json(
        { error: empErr.message || "Error consultando emparejamientos" },
        { status: 500 },
      );
    }

    const empRows = emp || [];

    // 3) Traer nombres y localidades de jinetes
    const jineteIds = Array.from(
      new Set(
        empRows
          .map((r: any) => r.jinete_id)
          .filter((v) => v !== null && v !== undefined)
          .map((v) => String(v)),
      ),
    );

    const nombres = new Map<string, string>();
    const localidades = new Map<string, string>();

    if (jineteIds.length > 0) {
      const { data: js, error: jsErr } = await supa
        .from(tables.jinetes)
        .select("id, nombre, apellido, localidad")
        .in("id", jineteIds);

      if (jsErr) {
        console.error("Error Supabase jinetes:", jsErr);
      } else {
        (js || []).forEach((j: any) => {
          const idStr = String(j.id);
          const nombreCompleto =
            [j.nombre, j.apellido].filter(Boolean).join(" ").trim() || idStr;
          nombres.set(idStr, nombreCompleto);
          if (j.localidad) {
            localidades.set(idStr, String(j.localidad));
          }
        });
      }
    }

    // 4) Armar filas para el PDF (formato que espera buildPdf)
    const rows = empRows.map((r: any, idx: number) => {
      const idStr = r.jinete_id != null ? String(r.jinete_id) : "";
      return {
        "#": idx + 1,
        palenque: String((idx % 3) + 1),
        jinete: nombres.get(idStr) ?? idStr,
        localidad: localidades.get(idStr) ?? "",
        caballo: r.caballo_nombre ?? "",
        tropilla: r.tropilla ?? "",
        puntos: "",
        obs: "",
      };
    });

    const pdfU8 = await buildPdf(rows, url.origin, categoriaNombre);
    const arrayBuffer = pdfU8.buffer as ArrayBuffer;

    return new NextResponse(arrayBuffer as any, {
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
