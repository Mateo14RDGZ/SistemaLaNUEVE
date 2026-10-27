"use client";

import { useRef, useState } from "react";
import { Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { money } from "@/lib/format";
type Item = { ingredientName: string; unit: string; quantity: string; unitCost: string };
const blank: Item = { ingredientName: "", unit: "", quantity: "", unitCost: "" };

export default function PurchasesPage() {
  const [items, setItems] = useState<Item[]>([{ ...blank }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const idempotencyKey = useRef("");

  function updateItem(index: number, field: keyof Item, value: string) {
    setItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    const purchase = {
      supplierName: form.get("supplierName") || undefined,
      paymentMethod: form.get("method"),
      detail: form.get("detail") || undefined,
      items: items.map(item => ({ ingredientName: item.ingredientName, unit: item.unit, quantity: Number(item.quantity), unitCost: Number(item.unitCost) })),
    };
    idempotencyKey.current ||= crypto.randomUUID();
    try {
      const response = await fetch("/api/purchases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idempotencyKey: idempotencyKey.current, purchase }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "No se pudo registrar la compra.");
      idempotencyKey.current = ""; window.location.assign("/gastos");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo registrar la compra."); }
    finally { setBusy(false); }
  }
  const total = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0);

  return <main className="page">
    <div className="eyebrow">Inventario</div><h1 className="page-title">Nueva compra</h1><p className="page-subtitle">La recepción actualiza el inventario y registra un único gasto asociado.</p>
    <div className="notice" style={{ marginTop: 16 }}>La cantidad y el precio se confirman durante la compra. No se inventan precios a partir de códigos.</div>
    <form className="form card" style={{ marginTop: 15 }} onSubmit={submit}>
      <div className="field"><label>Proveedor (opcional)</label><input name="supplierName" maxLength={120}/></div>
      <div className="field"><label>Medio de pago</label><select name="method"><option value="CASH">Efectivo</option><option value="TRANSFER">Transferencia</option><option value="CARD">Tarjeta</option><option value="OTHER">Otro</option></select></div>
      <div className="section-heading purchase-items-heading"><h2>Artículos recibidos</h2><button type="button" className="button secondary" onClick={() => setItems(current => [...current, { ...blank }])}><Plus size={15}/>Agregar artículo</button></div>
      {items.map((item, index) => <section className="purchase-item" key={index}><div className="top-line"><strong>Artículo {index + 1}</strong>{items.length > 1 && <button type="button" className="header-icon-button" aria-label={`Quitar artículo ${index + 1}`} onClick={() => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16}/></button>}</div>
        <div className="field"><label>Insumo</label><input value={item.ingredientName} onChange={event => updateItem(index, "ingredientName", event.target.value)} required maxLength={120} placeholder="Ej. Malta"/></div>
        <div className="form-grid"><div className="field"><label>Cantidad recibida</label><input value={item.quantity} onChange={event => updateItem(index, "quantity", event.target.value)} type="number" min="0.001" max="99999999999" step="0.001" required/></div><div className="field"><label>Unidad</label><input value={item.unit} onChange={event => updateItem(index, "unit", event.target.value)} required maxLength={20} placeholder="g, kg, unidad"/></div></div>
        <div className="field"><label>Costo unitario (UYU)</label><input value={item.unitCost} onChange={event => updateItem(index, "unitCost", event.target.value)} type="number" min="0" max="9999999999.99" step="0.01" required/></div>
      </section>)}
      <div className="top-line purchase-total"><b>Total de la compra</b><b>{money(total)}</b></div>
      <div className="field"><label>Detalle (opcional)</label><textarea name="detail" maxLength={500}/></div>
      {error && <div className="notice error" role="alert">{error}</div>}
      <button className="button full" disabled={busy}>{busy ? "Registrando…" : <><ShoppingBasket size={17}/>Confirmar compra</>}</button>
    </form>
  </main>;
}
