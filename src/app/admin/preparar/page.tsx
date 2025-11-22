
"use client";
import React, { useEffect, useMemo, useState } from "react";

type Sede = { id: string; ciudad?: string | null; fecha?: string | null };
type Categoria = { id: string; nombre: string };
type Jinete = { id: string; nombre: string; apellido?: string | null };
type CaballoRow = { orden: number; nombre: string; tropilla?: string | null };

async function safeJson(r: Response) {
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("application/json")) return r.json();
  const txt = await r.text();
  console.error("Respuesta no JSON:", txt);
  return { data: [], error: "Respuesta no JSON" };
}

export default function Preparar() {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [cats, setCats] = useState<Categoria[]>([]);
  const [sedeId, setSedeId] = useState<string>("");
  const [categoriaId, setCategoriaId] = useState<string>("");

  const [jinetes, setJinetes] = useState<Jinete[]>([]);
  const [excluir, setExcluir] = useState<Record<string, boolean>>({});

  const [caballos, setCaballos] = useState<CaballoRow[]>([]);
  const [resultado, setResultado] = useState<any[] | null>(null);

  useEffect(() => { loadSedes(); loadCategorias(); }, []);

  async function loadSedes() {
    const r = await fetch("/api/sedes");
    const j = await safeJson(r);
    if (r.ok) setSedes(j.data || []);
    else alert(j?.error || "Error cargando sedes");
  }
  async function loadCategorias() {
    const r = await fetch("/api/categorias");
    const j = await safeJson(r);
    if (r.ok) setCats(j.data || []);
    else alert(j?.error || "Error cargando categorías");
  }
  async function loadJinetes() {
    if (!categoriaId) return alert("Elegí una categoría");
    const r = await fetch(`/api/jinetes?categoriaId=${encodeURIComponent(categoriaId)}`);
    const j = await safeJson(r);
    if (r.ok) setJinetes(j.data || []);
    else alert(j?.error || "Error jinetes");
    setExcluir({});
  }
  async function loadCaballos() {
    if (!sedeId || !categoriaId) return alert("Elegí sede y categoría");
    const r = await fetch(`/api/caballos?categoriaId=${encodeURIComponent(categoriaId)}&sedeId=${encodeURIComponent(sedeId)}`);
    const j = await safeJson(r);
    if (r.ok) setCaballos(j.data || []);
    else alert(j?.error || "Error caballos");
  }
  async function onExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!sedeId || !categoriaId) return alert("Elegí sede y categoría primero");
    const fd = new FormData();
    fd.append("file", f);
    fd.append("sedeId", sedeId);
    fd.append("categoriaId", categoriaId);
    const r = await fetch("/api/caballos/import", { method: "POST", body: fd });
    const j = await safeJson(r);
    if (!r.ok) return alert(j.error || "Error importando");
    await loadCaballos();
    alert(`Importados: ${j.count}`);
  }

  const jinetesFiltrados = useMemo(() => jinetes.filter(j => !excluir[j.id]), [jinetes, excluir]);

  async function sortear() {
    if (!sedeId || !categoriaId) return alert("Elegí sede y categoría");
    const payload = { sedeId, categoriaId, excluirIds: Object.keys(excluir).filter(k => excluir[k]) };
    const r = await fetch("/api/sorteo", { method: "POST", body: JSON.stringify(payload) });
    const j = await safeJson(r);
    if (!r.ok) return alert(j.error || "Error sorteando");
    setResultado(j.rows);
  }

  function descargarPDF() {
  // Usa las filas visibles del sorteo y las envía por POST al endpoint del PDF
  // sin tocar nada más de la UI.
  // Espera que "resultado" contenga las filas renderizadas (como está en tu pantalla).
  // Abre en una pestaña nueva.
  // (No dejes nada después del cierre de esta función).
  // ------------------------------------------------------------------------------
  // Validación
  if (!resultado || !resultado.length) {
    alert("No hay filas para imprimir");
    return;
  }

  const rows = resultado.map((r: any, i: number) => ({
    jinete_id: r.jinete_id,
    orden: r.orden ?? i + 1,
    palenque: String((i % 3) + 1),
    jinete: r.jinete || r.jinete_nombre || r.Jinete || "",
    localidad: r.localidad || r.Localidad || "-",
    caballo: r.caballo || r.caballo_nombre || r.Caballo || "",
    tropilla: r.tropilla || r.Tropilla || "",
    puntos: r.puntos || "",
    observaciones: r.observaciones || "",
  }));

  // Nombre de la categoría seleccionada (para el título del PDF)
  const categoriaSeleccionada = cats.find(c => String(c.id) === String(categoriaId));
  const categoriaNombre = categoriaSeleccionada?.nombre || "";

  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/pdf/sorteo";
  form.target = "_blank";

  const inputRows = document.createElement("input");
  inputRows.type = "hidden";
  inputRows.name = "rows";
  inputRows.value = JSON.stringify(rows);

  const inputCat = document.createElement("input");
  inputCat.type = "hidden";
  inputCat.name = "categoriaNombre";
  inputCat.value = categoriaNombre;

  form.appendChild(inputRows);
  form.appendChild(inputCat);
  document.body.appendChild(form);
  form.submit();
  form.remove();
}

// <!-- <button className="border rounded px-3 py-2" onClick={loadCaballos}>Ver caballos</button> -->

  return (
    <main className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select className="border rounded px-3 py-2" value={sedeId} onChange={e => setSedeId(e.target.value)}>
          <option value="">Sede…</option>
          {sedes.map(s => (
            <option key={s.id} value={String(s.id)}>
              {s.ciudad || s.id} {s.fecha ? `(${s.fecha})` : ""}
            </option>
          ))}
        </select>
        <select className="border rounded px-3 py-2" value={categoriaId} onChange={e => setCategoriaId(e.target.value)}>
          <option value="">Categoría…</option>
          {cats.map(c => (
            <option key={c.id} value={String(c.id)}>
              {c.nombre}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button className="border rounded px-3 py-2" onClick={loadJinetes}>Cargar inscriptos</button>
        
        </div>
      </div>

      <section className="space-y-2">
        <h3 className="font-semibold">Inscriptos</h3>
        <div className="border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Excluir</th>
                <th className="text-left p-2">Jinete</th>
              </tr>
            </thead>
            <tbody>
              {jinetesFiltrados.map(j => (
                <tr key={j.id} className="border-t">
                  <td className="p-2">
                    <input type="checkbox" checked={!!excluir[j.id]}
                      onChange={e => setExcluir(prev => ({ ...prev, [j.id]: e.target.checked }))}/>
                  </td>
                  <td className="p-2">{[j.nombre, j.apellido].filter(Boolean).join(" ")}</td>
                </tr>
              ))}
              {jinetesFiltrados.length === 0 && (
                <tr><td className="p-3 text-gray-500" colSpan={2}>Sin datos…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">Caballos (orden de planilla)</h3>
          <label className="text-sm border rounded px-2 py-1 cursor-pointer">
            Importar Excel
            <input type="file" accept=".xlsx" className="hidden" onChange={onExcel} />
          </label>
        </div>
        <div className="border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">#</th>
                <th className="text-left p-2">Caballo</th>
                <th className="text-left p-2">Tropilla</th>
              </tr>
            </thead>
            <tbody>
              {caballos.map(c => (
                <tr key={c.orden} className="border-t">
                  <td className="p-2">{c.orden}</td>
                  <td className="p-2">{c.nombre}</td>
                  <td className="p-2">{c.tropilla || "-"}</td>
                </tr>
              ))}
              {caballos.length === 0 && (
                <tr><td className="p-3 text-gray-500" colSpan={3}>Sin datos…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex gap-3">
        <button className="bg-black text-white rounded px-4 py-2" onClick={sortear}>Sortear</button>
        <button className="border rounded px-3 py-2" onClick={descargarPDF}>Descargar PDF</button>
      </div>

      {resultado && (
        <div className="border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">#</th>
                <th className="text-left p-2">Jinete</th>
                <th className="text-left p-2">Caballo</th>
                <th className="text-left p-2">Tropilla</th>
              </tr>
            </thead>
            <tbody>
              {resultado.map((r: any, i: number) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{r.orden}</td>
                  <td className="p-2">{r.jinete_nombre}</td>
                  <td className="p-2">{r.caballo_nombre}</td>
                  <td className="p-2">{r.tropilla || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
