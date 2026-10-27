"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Package, Plus, SlidersHorizontal } from "lucide-react";
import { ProductForm } from "@/components/product-form";
import { money } from "@/lib/format";

type Variant = { id: string; label: string; sku: string; volumeMl: number; price: string; stock: number; minimumStock: number; commerciallyAvailable: boolean; barcodes: { value: string }[]; product: { id: string; name: string; beerType: string; style: string | null; status: string } };
type Ingredient = { id: string; name: string; unit: string; quantity: string; minimumQuantity: string; kind: string };
type Product = { id: string; name: string; beerType: string; style: string | null; status: string; variants: Omit<Variant, "product">[] };

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [showProduct, setShowProduct] = useState(false);
  const [showMovement, setShowMovement] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [movementError, setMovementError] = useState("");
  const variants = useMemo(() => products.flatMap(product => product.variants.map(variant => ({ ...variant, product: { id: product.id, name: product.name, beerType: product.beerType, style: product.style, status: product.status } }))), [products]);

  async function load() {
    try {
      const [productResponse, inventoryResponse] = await Promise.all([fetch("/api/products"), fetch("/api/inventory")]);
      const [productData, inventoryData] = await Promise.all([productResponse.json(), inventoryResponse.json()]);
      if (!productResponse.ok || !inventoryResponse.ok) throw new Error(productData.error || inventoryData.error || "No se pudo cargar el inventario.");
      setProducts(productData); setIngredients(inventoryData.ingredients); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar el inventario."); }
    finally { setLoaded(true); }
  }
  useEffect(() => { void load(); }, []);

  async function submitMovement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMovementError("");
    const form = new FormData(event.currentTarget); const target = String(form.get("target")); const [kind, id] = target.split(":");
    const type = String(form.get("type")); let quantity = Number(form.get("quantity"));
    if (type !== "ADJUSTMENT") quantity = Math.abs(quantity);
    const body = { idempotencyKey: crypto.randomUUID(), ...(kind === "variant" ? { variantId: id } : { ingredientId: id }), type, quantity, note: form.get("note") };
    try {
      const response = await fetch("/api/inventory/adjustments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "No se pudo registrar el movimiento.");
      setShowMovement(false); await load();
    } catch (e) { setMovementError(e instanceof Error ? e.message : "No se pudo registrar el movimiento."); }
    finally { setBusy(false); }
  }

  return <main className="page">
    <div className="eyebrow">Inventario</div><h1 className="page-title">Stock</h1><p className="page-subtitle">Cada cambio queda registrado con su movimiento.</p>
    <div className="stock-actions"><button className="button" onClick={() => setShowProduct(true)}><Plus size={17}/>Agregar producto</button><button className="button secondary" onClick={() => setShowMovement(true)}><SlidersHorizontal size={16}/>Ajustar stock</button></div>
    {error && <div className="notice error" role="alert">{error}</div>}
    <div className="metrics"><div className="metric"><div className="metric-label">Variantes</div><div className="metric-value">{variants.length}</div><div className="metric-foot">En el catálogo</div></div><div className="metric"><div className="metric-label">Stock bajo</div><div className="metric-value">{variants.filter(variant => variant.stock <= variant.minimumStock && variant.commerciallyAvailable).length + ingredients.filter(ingredient => Number(ingredient.quantity) <= Number(ingredient.minimumQuantity)).length}</div><div className="metric-foot">Cerveza e insumos</div></div></div>
    <div className="section-heading"><h2>Productos y variantes</h2><span className="row-sub">{products.length} productos</span></div>
    {!loaded ? <div className="loading">Cargando inventario…</div> : products.length === 0 ? <div className="card empty"><Package size={25} style={{ margin: "0 auto 9px", color: "var(--green)" }}/><strong>El catálogo está vacío</strong>Agregá el producto cuando hayan definido su nombre, presentación y disponibilidad comercial.</div> : products.map(product => <section className="card" key={product.id}><div className="top-line"><div className="row-main"><div className="row-title">{product.name}</div><div className="row-sub">{product.beerType}{product.style ? ` · ${product.style}` : ""}</div></div><span className={`badge ${product.status === "ACTIVE" ? "" : "warn"}`}>{product.status === "ACTIVE" ? "Activo" : "Borrador"}</span></div>{product.variants.map(variant => <div className="list-row" key={variant.id}><div className="row-main"><div className="top-line"><span className="row-title">{variant.label}</span><span className={`badge ${variant.stock === 0 ? "danger" : variant.stock <= variant.minimumStock ? "warn" : ""}`}>{variant.stock === 0 ? "Agotado" : variant.stock <= variant.minimumStock ? "Stock bajo" : "Disponible"}</span></div><div className="row-sub">SKU {variant.sku} · {variant.barcodes[0]?.value ?? "Sin código"}</div></div><div className="row-value">{variant.stock} <span className="row-sub">uds.</span><div className="row-sub">{money(variant.price)}</div></div></div>)}</section>)}
    <div className="section-heading"><h2>Insumos</h2><span className="row-sub">{ingredients.length} artículos</span></div>
    {ingredients.length === 0 ? <div className="card empty"><strong>Sin insumos registrados</strong>Las compras agregan malta, lúpulo, levadura y materiales al inventario al confirmar su recepción.</div> : <div className="card">{ingredients.map(ingredient => { const low = Number(ingredient.quantity) <= Number(ingredient.minimumQuantity); return <div className="list-row" key={ingredient.id}><span className="row-main"><span className="row-title">{ingredient.name}</span><span className="row-sub">{ingredient.unit}{Number(ingredient.minimumQuantity) > 0 ? ` · mínimo ${ingredient.minimumQuantity}` : ""}</span></span><span className={`row-value ${low ? "inventory-low" : ""}`}>{ingredient.quantity} {ingredient.unit}{low ? <span className="badge warn" style={{ display: "flex", marginTop: 4, justifyContent: "flex-end" }}>Stock bajo</span> : null}</span></div>; })}</div>}
    <div className="section-heading"><h2>Registrar un movimiento</h2></div><button className="quick-card full-card" onClick={() => setShowMovement(true)}><ArrowLeftRight size={18}/>Entrada, ajuste, merma o rotura</button>
    {showProduct && <div className="backdrop" onClick={() => setShowProduct(false)}><div className="sheet" onClick={event => event.stopPropagation()}><div className="sheet-handle"/><div className="eyebrow">Catálogo</div><h2 className="page-title" style={{ fontSize: 25, marginBottom: 16 }}>Nuevo producto</h2><ProductForm onDone={() => { setShowProduct(false); void load(); }} onCancel={() => setShowProduct(false)}/></div></div>}
    {showMovement && <div className="backdrop" onClick={() => setShowMovement(false)}><div className="sheet" onClick={event => event.stopPropagation()}><div className="sheet-handle"/><div className="eyebrow">Inventario</div><h2 className="page-title" style={{ fontSize: 25, marginBottom: 8 }}>Nuevo movimiento</h2><p className="page-subtitle" style={{ marginBottom: 16 }}>El movimiento y el saldo se guardan juntos. No se permite stock negativo.</p><form className="form" onSubmit={submitMovement}>
      <div className="field"><label>Artículo</label><select name="target" required defaultValue=""><option value="" disabled>Elegí una presentación o insumo</option><optgroup label="Cerveza embotellada">{variants.map(variant => <option key={variant.id} value={`variant:${variant.id}`}>{variant.product.name} · {variant.label} · {variant.stock} unidades</option>)}</optgroup><optgroup label="Ingredientes y materiales">{ingredients.map(ingredient => <option key={ingredient.id} value={`ingredient:${ingredient.id}`}>{ingredient.name} · {ingredient.quantity} {ingredient.unit}</option>)}</optgroup></select></div>
      <div className="field"><label>Tipo</label><select name="type" defaultValue="ADJUSTMENT"><option value="ADJUSTMENT">Ajuste de saldo</option><option value="WASTE">Merma / consumo no vendible</option><option value="BREAKAGE">Rotura</option></select></div>
      <div className="field"><label>Cantidad</label><input name="quantity" type="number" step="0.001" min="-1000000" max="1000000" defaultValue="1" required/><span className="row-sub">Usá un valor positivo para ingresar y negativo para descontar en un ajuste. Merma y rotura siempre descuentan.</span></div>
      <div className="field"><label>Motivo</label><textarea name="note" required minLength={3} maxLength={300} placeholder="Ej. Conteo físico del 26/10"/></div>
      {movementError && <div className="notice error" role="alert">{movementError}</div>}
      <div className="actions"><button type="button" className="button ghost" style={{ flex: 1 }} onClick={() => setShowMovement(false)}>Cancelar</button><button className="button" style={{ flex: 1 }} disabled={busy}>{busy ? "Guardando…" : "Guardar movimiento"}</button></div>
    </form></div></div>}
  </main>;
}
