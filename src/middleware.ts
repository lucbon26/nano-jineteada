import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const COOKIE_NAME = "app_session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin")) {
    const hasCookie = (req.headers.get("cookie") || "").includes(COOKIE_NAME + "=");
    if (!hasCookie) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
