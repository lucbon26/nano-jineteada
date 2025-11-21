import { NextResponse } from 'next/server';

function parseUsers(env?: string) {
  if (!env) return [];
  return env.split(',').map(s => s.trim()).filter(Boolean).map(pair => {
    const [u, p] = pair.split(':').map(x => (x ?? '').trim());
    return { u, p };
  }).filter(({u,p}) => u && p);
}

export async function POST(req: Request) {
  try {
    const { user, pass } = await req.json();
    const list = parseUsers(process.env.AUTH_USERS);
    const ok = list.some(({u,p}) => u === String(user || '') && p === String(pass || ''));
    if (!ok) {
      return NextResponse.json({ ok: false, error: 'Invalid credentials' }, { status: 401 });
    }
    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Bad request' }, { status: 400 });
  }
}
