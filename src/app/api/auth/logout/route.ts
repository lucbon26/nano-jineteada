import { NextResponse } from "next/server";
import { clearSessionCookie } from "../../../../lib/supa";

export async function POST() {
  const clr = clearSessionCookie();
  return new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Set-Cookie": clr, "Content-Type": "application/json" }
  });
}
