"use client";

import { useEffect, useState } from "react";
import { ScanLine, ReceiptText } from "lucide-react";
import { SaleForm } from "@/components/sale-form";
import { money } from "@/lib/format";

type Sale = { id: string; total: string; status: string; createdAt: string; items: { quantity: number; productNameSnapshot: string; variantLabelSnapshot: string }[] };
type Variant = { id: string; label: string; sku: string; stock: number; price: string; product: { name: string }; commerciallyAvailable: boolean; barcodes?: { value: string }[] };

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [show, setShow] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [canceling, setCanceling] = useState("");

  async function load() {
    setError("");
    try {
      const [salesResponse, productsResponse, userResponse] = await Promise.all([fetch("/api/sales"), fetch("/api/products"), fetch("/api/auth/me")]);
      const [salesData, productData, userData] = await Promise.all([salesResponse.json(), productsResponse.json(), userResponse.json()]);
      if (!salesResponse.ok || !productsResponse.ok) throw new Error(salesData.error || productData.error || "No se pudo cargar el historial.");
      setSales(salesData); setRole(userData?.user?.role || "");
      setVariants(productData.flatMap((product: { name: string; variants: Variant[] }) => product.variants.filter(variant => variant.commerciallyAvailable).map(variant => ({ ...variant, product: { name: product.name } }))));
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar el historial."); }
    finally { setLoaded(true); }
  }
  useEffect(() => { void load(); }, []);

  async function cancelSale(sale: Sale) {
    const reason = window.prompt("Motivo de la cancelación (queda en el historial):");
    if (reason === null) return;
    if (reason.trim().length < 3) { setError("Escribí un motivo de al menos 3 caracteres."); return; }
    setCanceling(sale.id); setError("");
    try {
      const response = await fetch(`/api/sales/${sale.id}/cancel`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "No se pudo cancelar la venta.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cancelar la venta."); }
    finally { setCanceling(""); }
  }

  return <main className="page">
    <div className="eyebrow">Operaciones</div><h1 className="page-title">Ventas</h1><p className="page-subtitle">Registrá cada venta y mantené el stock al día.</p>
    <button className="button full" style={{ marginTop: 18 }} onClick={() => setShow(true)}><ScanLine size={18}/>Nueva venta</button>
    <div className="section-heading"><h2>Historial reciente</h2><span className="row-sub">Últimas 50</span></div>
    {error && <div className="notice error" role="alert">{error}</div>}
    {!loaded ? <div className="loading">Cargando ventas…</div> : sales.length === 0 ? <div className="card empty"><ReceiptText size={25} style={{ margin: "0 auto 9px", color: "var(--brand)" }}/><strong>Aún no hay ventas</strong>Cuando registres una, su detalle aparecerá en este historial.</div> : <div className="card">{sales.map(sale => <div className="sale-record" key={sale.id}><div className="list-row"><span className="row-main"><span className="row-title">{sale.items.reduce((count, item) => count + item.quantity, 0)} unidades · {sale.status === "COMPLETED" ? "Completada" : "Cancelada"}</span><span className="row-sub">{sale.items.map(item => `${item.quantity} × ${item.productNameSnapshot} ${item.variantLabelSnapshot}`).join(", ")} · {new Date(sale.createdAt).toLocaleString("es-UY", { dateStyle: "short", timeStyle: "short" })}</span><span className="row-sub">Operación {sale.id}</span></span><span className="row-value">{money(sale.total)}</span></div>{role === "ADMIN" && sale.status === "COMPLETED" && <button className="button ghost sale-cancel" disabled={canceling === sale.id} onClick={() => void cancelSale(sale)}>{canceling === sale.id ? "Cancelando…" : "Cancelar venta"}</button>}</div>)}</div>}
    {show && <div className="backdrop" onClick={() => setShow(false)}><div className="sheet" onClick={event => event.stopPropagation()}><div className="sheet-handle"/><div className="eyebrow">Punto de venta</div><h2 className="page-title" style={{ fontSize: 25, marginBottom: 16 }}>Nueva venta</h2><SaleForm variants={variants} onDone={() => { setShow(false); void load(); }} onCancel={() => setShow(false)}/></div></div>}
  </main>;
}
