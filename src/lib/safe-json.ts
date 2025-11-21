import { NextRequest, NextResponse } from "next/server";

export async function readBody(req: NextRequest) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await req.json();
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    return Object.fromEntries(form.entries());
  }
  if (ct.includes("text/")) return await req.text();
  try { return await req.json(); } catch { return await req.text(); }
}

export function ok(data: any = {}) {
  return NextResponse.json({ ok: true, ...data });
}
export function fail(error: unknown, status = 500) {
  const msg = (error as any)?.message ?? String(error ?? "Error");
  return NextResponse.json({ ok: false, error: msg }, { status });
}
