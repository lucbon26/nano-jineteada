import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, makeSessionCookie, validateCredentials } from "../../../../lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!validateCredentials(username, password)) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }
    const setCookie = makeSessionCookie(username);
    return new NextResponse(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Set-Cookie": setCookie, "Content-Type": "application/json" }
    });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || "Error de login" }, { status: 500 });
  }
}

export async function GET() {
  const clr = clearSessionCookie();
  return new NextResponse(null, { status: 204, headers: { "Set-Cookie": clr } });
}
