import { NextRequest } from "next/server";
import { ok, fail, readBody } from "@/lib/safe-json";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await readBody(req);
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function GET() {
  try {
    return ok({ data: [] });
  } catch (e) {
    return fail(e);
  }
}
