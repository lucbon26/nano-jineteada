import crypto from "crypto";

const COOKIE_NAME = "app_session";

export function getAuthSecret() {
  return process.env.AUTH_SECRET || "dev-secret-change-me";
}

function sign(value: string, secret: string) {
  const h = crypto.createHmac("sha256", secret).update(value).digest("hex");
  return `${value}.${h}`;
}
export function makeSessionCookie(username: string) {
  const secret = getAuthSecret();
  const payload = JSON.stringify({ u: username, t: Date.now() });
  const signed = sign(payload, secret);
  return `${COOKIE_NAME}=${signed}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60*60*12}`;
}
export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function validateCredentials(username: string, password: string): boolean {
  const list = (process.env.AUTH_USERS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(p => {
      const [u, ...rest] = p.split(":");
      const pass = rest.join(":"); // por si la pass contiene ':'
      return [u?.trim() || "", pass?.trim() || ""];
    });
  for (const [u,p] of list) {
    if (u && p && username === u && password === p) return true;
  }
  const u1 = (process.env.ADMIN_USER || "").trim();
  const p1 = (process.env.ADMIN_PASS || "").trim();
  if (u1 && p1 && username === u1 && password === p1) return true;
  return false;
}
