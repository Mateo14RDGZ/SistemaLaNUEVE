"use client";

import { useEffect, useMemo, useState } from "react";
import { FlaskConical, Plus } from "lucide-react";

type Batch = { id: string; code: string; status: string; plannedVolumeMl: number; producedVolumeMl: number | null; lossVolumeMl: number; sellableUnits: number; createdAt: string; recipe: { name: string } | null; notes: string | null };
type Variant = { id: string; label: string; product: { name: string } };
const labels: Record<string, string> = { PLANNED: "Planificado", BREWING: "En elaboración", FERMENTING: "Fermentando", CONDITIONING: "En acondicionamiento", BOTTLED: "Embotellado", INTERNAL_TRIAL: "Prueba interna", RELEASED: "Liberado para venta", DISCARDED: "Descartado" };
const next: Record<string, string[]> = { PLANNED: ["BREWING", "DISCARDED"], BREWING: ["FERMENTING", "DISCARDED"], FERMENTING: ["CONDITIONING", "DISCARDED"], CONDITIONING: ["BOTTLED", "INTERNAL_TRIAL", "DISCARDED"], BOTTLED: ["INTERNAL_TRIAL", "RELEASED", "DISCARDED"], INTERNAL_TRIAL: ["RELEASED", "DISCARDED"], RELEASED: [], DISCARDED: [] };

export default function BatchesPage() {
  const [items, setItems] = useState<Batch[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [show, setShow] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [advance, setAdvance] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [formBusy, setFormBusy] = useState(false);

  async function load() {
    try {
      const [batchResponse, productResponse] = await Promise.all([fetch("/api/batches"), fetch("/api/products")]);
      if (!batchResponse.ok || !productResponse.ok) throw new Error("No se pudo cargar la información de elaboración.");
      const products = await productResponse.json();
      setItems(await batchResponse.json());
      setVariants(products.flatMap((product: { name: string; variants: Omit<Variant, "product">[] }) => product.variants.map(variant => ({ ...variant, product: { name: product.name } }))));
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar la información."); }
    finally { setLoaded(true); }
  }
  useEffect(() => { void load(); }, []);

  async function createBatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/batches", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: form.get("code"), plannedVolumeMl: Number(form.get("volume")), recipeName: form.get("recipe") || undefined, notes: form.get("notes") || undefined }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "No se pudo guardar el lote.");
      setShow(false); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar el lote."); }
    finally { setBusy(false); }
  }

  async function updateBatch(event: React.FormEvent<HTMLFormElement>, batch: Batch) {
    event.preventDefault(); setFormBusy(true); setFormError("");
    const form = new FormData(event.currentTarget); const status = String(form.get("status"));
    const body: Record<string, unknown> = { status, notes: form.get("notes") || undefined };
    if (status === "BOTTLED") { body.producedVolumeMl = Number(form.get("producedVolumeMl")); body.lossVolumeMl = Number(form.get("lossVolumeMl")); }
    if (status === "RELEASED") { body.variantId = form.get("variantId"); body.sellableUnits = Number(form.get("sellableUnits")); }
    try {
      const response = await fetch(`/api/batches/${batch.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "No se pudo actualizar el lote.");
      setAdvance(current => { const nextState = { ...current }; delete nextState[batch.id]; return nextState; }); await load();
    } catch (e) { setFormError(e instanceof Error ? e.message : "No se pudo actualizar el lote."); }
    finally { setFormBusy(false); }
  }

  const visibleVariants = useMemo(() => variants, [variants]);
  return <main className="page">
    <div className="eyebrow">Elaboración</div><h1 className="page-title">Lotes</h1><p className="page-subtitle">Seguí cada etapa. El stock comercial solo aumenta al liberar unidades.</p>
    <button className="button full" style={{ marginTop: 18 }} onClick={() => setShow(true)}><Plus size={17}/>Planificar lote</button>
    <div className="section-heading"><h2>Historial</h2></div>
    {error && <div className="notice error" role="alert">{error}</div>}
    {!loaded ? <div className="loading">Cargando lotes…</div> : items.length === 0 ? <div className="card empty"><FlaskConical size={25} style={{ margin: "0 auto 9px", color: "var(--green)" }}/><strong>Sin lotes registrados</strong>Planificá el primer lote cuando tengan la receta y el código definidos.</div> : <div className="card">{items.map(batch => {
      const options = next[batch.status] || []; const target = advance[batch.id] || options[0] || "";
      return <section key={batch.id} className="batch-record">
        <div className="list-row"><span className="row-main"><span className="row-title">Lote {batch.code}</span><span className="row-sub">{batch.recipe?.name || "Sin receta"} · {batch.plannedVolumeMl.toLocaleString("es-UY")} ml planificados · {new Date(batch.createdAt).toLocaleDateString("es-UY")}</span>{batch.producedVolumeMl !== null && <span className="row-sub">Producidos {batch.producedVolumeMl.toLocaleString("es-UY")} ml · merma {batch.lossVolumeMl.toLocaleString("es-UY")} ml</span>}{batch.status === "RELEASED" && <span className="row-sub">{batch.sellableUnits} unidades incorporadas al inventario</span>}</span><span className={`badge ${batch.status === "DISCARDED" ? "danger" : batch.status === "RELEASED" ? "" : "warn"}`}>{labels[batch.status] || batch.status}</span></div>
        {options.length > 0 && <form className="form batch-advance" onSubmit={event => updateBatch(event, batch)}>
          <div className="field"><label htmlFor={`status-${batch.id}`}>Registrar etapa</label><select id={`status-${batch.id}`} name="status" value={target} onChange={event => setAdvance(current => ({ ...current, [batch.id]: event.target.value }))}>{options.map(option => <option key={option} value={option}>{labels[option]}</option>)}</select></div>
          {target === "BOTTLED" && <div className="form-grid"><div className="field"><label>Volumen producido (ml)</label><input name="producedVolumeMl" type="number" min="1" max="500000" required/></div><div className="field"><label>Merma (ml)</label><input name="lossVolumeMl" type="number" min="0" max="500000" defaultValue="0" required/></div></div>}
          {target === "RELEASED" && <><div className="notice">La liberación agrega las unidades informadas al stock de una presentación.</div><div className="field"><label>Presentación</label><select name="variantId" required defaultValue=""><option value="" disabled>Elegí producto y presentación</option>{visibleVariants.map(variant => <option key={variant.id} value={variant.id}>{variant.product.name} · {variant.label}</option>)}</select></div><div className="field"><label>Unidades vendibles</label><input name="sellableUnits" type="number" min="1" max="100000" required/></div></>}
          {target === "DISCARDED" && <div className="notice error">El descarte queda registrado en el historial. No modifica existencias comerciales.</div>}
          <div className="field"><label>Nota de etapa (opcional)</label><textarea name="notes" maxLength={1000} defaultValue={batch.notes || ""}/></div>
          {formError && <div className="notice error" role="alert">{formError}</div>}
          <button className="button full" disabled={formBusy}>{formBusy ? "Guardando…" : `Guardar: ${labels[target]}`}</button>
        </form>}
      </section>;
    })}</div>}
    {show && <div className="backdrop" onClick={() => setShow(false)}><div className="sheet" onClick={event => event.stopPropagation()}><div className="sheet-handle"/><div className="eyebrow">Elaboración</div><h2 className="page-title" style={{ fontSize: 25, marginBottom: 16 }}>Nuevo lote</h2><form className="form" onSubmit={createBatch}><div className="field"><label>Código del lote</label><input name="code" placeholder="Ej. LN-2026-01" required maxLength={40}/></div><div className="field"><label>Volumen planificado (ml)</label><input name="volume" type="number" defaultValue="3800" min="1" max="500000" required/></div><div className="field"><label>Receta (opcional)</label><input name="recipe" placeholder="Nombre de receta" maxLength={100}/></div><div className="field"><label>Notas</label><textarea name="notes" maxLength={1000}/></div><div className="notice">Un lote nuevo empieza como planificado. No genera stock hasta que registres su liberación.</div>{error && <div className="notice error" role="alert">{error}</div>}<div className="actions"><button type="button" className="button ghost" style={{ flex: 1 }} onClick={() => setShow(false)}>Cancelar</button><button className="button" style={{ flex: 1 }} disabled={busy}>{busy ? "Guardando…" : "Crear lote"}</button></div></form></div></div>}
  </main>;
}
