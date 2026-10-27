"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { Camera, Keyboard, ScanLine, Link2 } from "lucide-react";
import { SaleForm } from "@/components/sale-form";

type Variant = { id: string; label: string; sku: string; stock: number; price: string; commerciallyAvailable: boolean; barcodes: { value: string }[]; product: { name: string } };
type ProductPayload = { name: string; variants: Omit<Variant, "product">[] };

export function Scanner({ online, onDone }: { online: boolean; onDone: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const reader = useRef<BrowserMultiFormatReader | null>(null);
  const controls = useRef<IScannerControls | null>(null);
  const handledCode = useRef(false);
  const [active, setActive] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [manual, setManual] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [role, setRole] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [associateVariant, setAssociateVariant] = useState("");
  const [associateBusy, setAssociateBusy] = useState(false);
  const [associateMessage, setAssociateMessage] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([fetch("/api/products"), fetch("/api/auth/me")])
      .then(async ([productsResponse, userResponse]) => {
        if (!productsResponse.ok) throw new Error("No se pudieron cargar los productos.");
        const [products, userData] = await Promise.all([productsResponse.json() as Promise<ProductPayload[]>, userResponse.json()]);
        if (!alive) return;
        setVariants(products.flatMap(product => product.variants.filter(variant => variant.commerciallyAvailable).map(variant => ({ ...variant, product: { name: product.name } }))));
        setRole(userData?.user?.role || "");
      })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : "No se pudieron cargar los productos."); })
      .finally(() => { if (alive) setLoaded(true); });
    return () => {
      alive = false;
      controls.current?.stop();
      const stream = video.current?.srcObject;
      if (stream instanceof MediaStream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  async function start() {
    setError("");
    if (!online) { setError("Necesitás conexión para consultar stock y confirmar una venta."); return; }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { setError("La cámara necesita HTTPS. Abrí LA NUEVE desde su dirección segura o ingresá el código manualmente."); return; }
    try {
      handledCode.current = false;
      reader.current = new BrowserMultiFormatReader();
      setActive(true);
      controls.current = await reader.current.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        video.current ?? undefined,
        (result, scanError) => {
          if (result && !handledCode.current) {
            handledCode.current = true;
            setCode(result.getText());
            controls.current?.stop();
            setActive(false);
          } else if (scanError?.name === "NotAllowedError") {
            controls.current?.stop();
            setActive(false);
            setError("No se concedió permiso para la cámara. Habilitalo en Safari o ingresá el código manualmente.");
          }
        },
      );
    } catch (e) {
      setActive(false);
      const name = e instanceof Error ? e.name : "";
      setError(name === "NotAllowedError" || name === "PermissionDeniedError"
        ? "No se concedió permiso para la cámara. Habilitalo en Safari o ingresá el código manualmente."
        : name === "NotReadableError" || name === "TrackStartError"
          ? "La cámara está ocupada por otra app. Cerrala e intentá de nuevo."
          : "No se pudo abrir la cámara. Revisá los permisos o ingresá el código manualmente.");
    }
  }

  async function associateCode() {
    if (!code || !associateVariant) return;
    setAssociateBusy(true); setAssociateMessage(""); setError("");
    try {
      const response = await fetch(`/api/products/${associateVariant}/barcodes`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ value: code }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "No se pudo asociar el código.");
      setVariants(current => current.map(variant => variant.id === associateVariant ? { ...variant, barcodes: [...variant.barcodes, { value: code }] } : variant));
      setAssociateMessage("Código asociado. La presentación quedó agregada a la venta.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo asociar el código."); }
    finally { setAssociateBusy(false); }
  }

  if (!loaded) return <div className="loading">Buscando productos…</div>;
  if (code) {
    const known = variants.some(variant => variant.sku === code || variant.barcodes.some(barcode => barcode.value === code));
    return <>
      <div className="notice" style={{ margin: "15px 0" }}>Código leído: <b>{code}</b></div>
      {!known && role === "ADMIN" && <form className="card form" onSubmit={event => { event.preventDefault(); void associateCode(); }}>
        <div className="top-line"><strong>Asociar este código</strong><Link2 size={16} color="var(--brand)"/></div>
        <p className="row-sub">Vinculalo con la presentación correcta para que los próximos escaneos la encuentren.</p>
        <div className="field"><label htmlFor="scan-variant">Presentación</label><select id="scan-variant" value={associateVariant} onChange={event => setAssociateVariant(event.target.value)} required><option value="">Elegí un producto</option>{variants.map(variant => <option value={variant.id} key={variant.id}>{variant.product.name} · {variant.label}</option>)}</select></div>
        {associateMessage && <div className="notice" role="status">{associateMessage}</div>}
        <button className="button secondary full" disabled={associateBusy || !associateVariant}>{associateBusy ? "Asociando…" : "Asociar y agregar a venta"}</button>
      </form>}
      <SaleForm variants={variants} initialBarcode={code} onDone={onDone} onCancel={() => { setCode(""); setAssociateMessage(""); }}/>
    </>;
  }
  if (manual) return <><button className="button ghost" onClick={() => setManual(false)} style={{ width: "100%", margin: "14px 0" }}>Volver al escáner</button><SaleForm variants={variants} onDone={onDone} onCancel={() => setManual(false)}/></>;

  return <div style={{ paddingTop: 14 }}><div className="scan-box"><video ref={video} muted playsInline autoPlay style={{ display: active ? "block" : "none" }}/>{active ? <div className="scan-frame"/> : <><ScanLine size={42} strokeWidth={1.2}/><span style={{ fontSize: 12, opacity: .8, marginTop: -55 }}>Centrà el código dentro del marco</span></>}</div>{error && <div className="notice error" role="alert" style={{ marginTop: 10 }}>{error}</div>}<div className="scanner-actions"><button className="button" style={{ flex: 1 }} onClick={active ? () => { controls.current?.stop(); setActive(false); } : start}><Camera size={17}/>{active ? "Detener cámara" : "Abrir cámara"}</button><button className="button secondary" onClick={() => setManual(true)}><Keyboard size={17}/>Ingresar manualmente</button></div><p className="row-sub" style={{ textAlign: "center", marginTop: 11 }}>La cámara requiere permiso y conexión segura HTTPS. Si la luz es baja, acercá el código y mantenelo quieto.</p></div>;
}
