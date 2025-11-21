import { NextRequest, NextResponse } from "next/server";
// @ts-ignore - usamos el bundle standalone de pdfkit (sin tipos TS)
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";

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
  } catch {
    return null;
  }
}

/**
 * Construye el PDF en memoria y devuelve un Uint8Array con el binario.
 */
async function buildPdf(rows: any[], origin: string): Promise<Uint8Array> {
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
  const subtitulo = "Clasificatorio rumbo a Jesús María 2026 - BASTOS";
  doc.fontSize(14).font("Helvetica").text(subtitulo, { align: "center" });

  doc.moveDown(0.5);
  const fechaStr = new Date().toLocaleString("en-GB", {
    timeZone: "UTC",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.fontSize(10).text(`Generado: ${fechaStr} GMT+0`, { align: "center" });

  doc.moveDown(1.2);

  // === LOGOS DESDE /public/logo.png y /public/bandera.png (opcionales) ===
  const logoDataUrl = await loadImageDataURL(origin, "/logo.png");
  const banderaDataUrl = await loadImageDataURL(origin, "/bandera.png");

  const headerY = doc.y;
  const logoH = 28;

  if (logoDataUrl) {
    // @ts-ignore - pdfkit acepta data URLs
    doc.image(logoDataUrl, doc.page.margins.left, headerY, { height: logoH });
  }
  if (banderaDataUrl) {
    const xRight = doc.page.width - doc.page.margins.right - 60;
    // @ts-ignore
    doc.image(banderaDataUrl, xRight, headerY, { height: logoH });
  }

  doc.moveDown(1.8);

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

  // Header
  let x = startX;
  let y = startY;
  colDefs.forEach((col) => {
    drawCell(x, y, col.width, rowHeight, col.label, true);
    x += col.width;
  });

  // Body
  const safeRows = Array.isArray(rows) ? rows : [];
  let index = 1;
  for (const r of safeRows) {
    y += rowHeight;
    x = startX;

    const get = (k: string): string => {
      if (k === "#") return index.toString().padStart(2, "0");
      const v =
        (r && (r as any)[k]) ??
        (r && (r as any)[k.toLowerCase()]) ??
        (r && (r as any)[k.toUpperCase()]);
      return v == null ? "" : String(v);
    };

    colDefs.forEach((col) => {
      drawCell(x, y, col.width, rowHeight, get(col.key as string));
      x += col.width;
    });

    index++;
    // Nueva página si nos pasamos
    if (y + rowHeight * 2 > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
      x = startX;
      colDefs.forEach((col) => {
        drawCell(x, y, col.width, rowHeight, col.label, true);
        x += col.width;
      });
    }
  }

  doc.end();
  return await done;
}

// POST: usa las filas que vienen desde la UI
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rows = (body && (body as any).rows) || body || [];
    const url = new URL(req.url);

    const pdfU8 = await buildPdf(rows, url.origin);
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

// GET: genera un PDF vacío (sin filas) para pruebas rápidas en el navegador
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pdfU8 = await buildPdf([], url.origin);
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
