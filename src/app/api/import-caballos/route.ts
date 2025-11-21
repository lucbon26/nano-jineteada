import { NextRequest } from "next/server";
import { ok, fail, readBody } from "../../../../lib/safe-json";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await readBody(req);
    const file = body.file as File | undefined;
    if (file) {
      const XLSX = await import("xlsx");
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      return ok({ rowsCount: rows.length });
    }
    return fail(new Error("No se recibió archivo 'file'"), 400);
  } catch (e) {
    return fail(e);
  }
}
