"use client";
import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const j = await r.json().catch(()=>({}));
      if (!r.ok) throw new Error(j?.error || "Credenciales inválidas");
      // Si hay ?next= en la URL, ir ahí; si no, a /admin/preparar
      const url = new URL(window.location.href);
      const next = url.searchParams.get("next") || "/admin/preparar";
      window.location.href = next;
    } catch (err:any) {
      setError(err.message || "Error de login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm border rounded-xl p-6 space-y-4">
        <h1 className="text-xl font-semibold text-center">Acceso</h1>
        <div className="space-y-2">
          <label className="text-sm">Usuario</label>
          <input className="w-full border rounded px-3 py-2" value={username} onChange={e=>setUsername(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm">Contraseña</label>
          <input type="password" className="w-full border rounded px-3 py-2" value={password} onChange={e=>setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={loading} className="w-full bg-black text-white rounded px-4 py-2">
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
