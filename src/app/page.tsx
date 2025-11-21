'use client'
import { useState, useEffect } from 'react';

export default function Home() {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Si ya está logueado, redirige directo
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('auth') === 'ok') {
        window.location.replace('/admin/preparar');
      }
    } catch {}
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: user.trim(), pass })
      });
      if (!r.ok) throw new Error('Usuario o contraseña incorrectos');
      const data = await r.json();
      if (data?.ok) {
        try { localStorage.setItem('auth', 'ok'); localStorage.setItem('auth_user', user.trim()); } catch {}
        window.location.href = '/admin/preparar';
        return;
      }
      throw new Error('Usuario o contraseña incorrectos');
    } catch (err: any) {
      setError(err?.message || 'Error de autenticación');
    }
  };

  return (
    <main style={{display:'grid',placeItems:'center',minHeight:'80vh'}}>
      <div style={{width:'100%',maxWidth:360,background:'#fff',border:'1px solid #e5e7eb',borderRadius:12,boxShadow:'0 1px 3px rgba(16,24,40,.06), 0 1px 2px rgba(16,24,40,.04)'}}>
        <form onSubmit={onSubmit} style={{padding:20}}>
          <h1 style={{fontSize:22, fontWeight:800, margin:'4px 0 16px'}}>Ingreso</h1>
          <div style={{display:'grid', gap:10}}>
            <label style={{fontSize:13, color:'#374151'}}>Usuario</label>
            <input
              value={user}
              onChange={e=>setUser(e.target.value)}
              placeholder="Usuario"
              style={{height:40,borderRadius:10,border:'1px solid #e5e7eb',padding:'0 12px'}}
              autoFocus
            />
            <label style={{fontSize:13, color:'#374151', marginTop:6}}>Contraseña</label>
            <input
              type="password"
              value={pass}
              onChange={e=>setPass(e.target.value)}
              placeholder="••••••••"
              style={{height:40,borderRadius:10,border:'1px solid #e5e7eb',padding:'0 12px'}}
            />
            {error && <div style={{color:'#b91c1c', fontSize:13}}>{error}</div>}
            <button type="submit" style={{height:40,borderRadius:10,background:'#111',color:'#fff',border:'1px solid #111',cursor:'pointer'}}>Entrar</button>
          </div>

          <div style={{marginTop:14, fontSize:12, color:'#6b7280'}}>
            <div></div>
          </div>
        </form>
      </div>
    </main>
  );
}
