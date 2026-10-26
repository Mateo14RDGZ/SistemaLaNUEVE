"use client";
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { Camera, Keyboard, ScanLine } from "lucide-react";
import { SaleForm } from "@/components/sale-form";

export function Scanner({ online, onDone }: { online: boolean; onDone: () => void }) {
  const video = useRef<HTMLVideoElement>(null); const reader = useRef<BrowserMultiFormatReader | null>(null); const controls = useRef<IScannerControls | null>(null); const [active, setActive] = useState(false); const [code, setCode] = useState(""); const [error, setError] = useState(""); const [manual, setManual] = useState(false); const [variants, setVariants] = useState<any[]>([]); const [loaded, setLoaded] = useState(false);
  useEffect(() => { fetch("/api/products").then(r => r.ok ? r.json() : []).then((products: any[]) => setVariants(products.flatMap(p => p.variants.map((v: any) => ({ ...v, product: { name: p.name } })).filter((v: any) => v.commerciallyAvailable)))).catch(() => {}).finally(() => setLoaded(true)); return () => { controls.current?.stop(); }; }, []);
  async function start() {
    setError(""); if (!online) { setError("Necesitás conexión para consultar stock y confirmar una venta."); return; }
    try { reader.current = new BrowserMultiFormatReader(); const devices = await BrowserMultiFormatReader.listVideoInputDevices(); const preferred = devices.find(d => /back|rear|environment/i.test(d.label))?.deviceId || devices[devices.length - 1]?.deviceId; if (!preferred) throw new Error("No encontramos una cámara. Permití el acceso o ingresá el código manualmente."); setActive(true); controls.current = await reader.current.decodeFromVideoDevice(preferred, video.current!, result => { if (result) { setCode(result.getText()); controls.current?.stop(); setActive(false); } }); } catch (e) { setActive(false); setError(e instanceof Error ? e.message : "No se pudo abrir la cámara. Revisá los permisos del navegador."); }
  }
  if (!loaded) return <div className="loading">Buscando productos…</div>;
  if (code) return <><div className="notice" style={{ margin: "15px 0" }}>Código leído: <b>{code}</b></div><SaleForm variants={variants} initialBarcode={code} onDone={onDone} onCancel={() => setCode("")}/></>;
  if (manual) return <><button className="button ghost" onClick={() => setManual(false)} style={{ width: "100%", margin: "14px 0" }}>Volver al escáner</button><SaleForm variants={variants} onDone={onDone} onCancel={() => setManual(false)}/></>;
  return <div style={{ paddingTop: 14 }}>{active ? <div className="scan-box"><video ref={video} muted playsInline/><div className="scan-frame"/></div> : <div className="scan-box"><ScanLine size={42} strokeWidth={1.2}/><span style={{ fontSize: 12, opacity: .8, marginTop: -55 }}>Centrà el código dentro del marco</span></div>}{error && <div className="notice error" style={{ marginTop: 10 }}>{error}</div>}<div className="scanner-actions"><button className="button" style={{ flex: 1 }} onClick={active ? () => { controls.current?.stop(); setActive(false); } : start}><Camera size={17}/>{active ? "Detener cámara" : "Abrir cámara"}</button><button className="button secondary" onClick={() => setManual(true)}><Keyboard size={17}/>Ingresar manualmente</button></div><p className="row-sub" style={{ textAlign: "center", marginTop: 11 }}>La cámara requiere permiso y conexión segura HTTPS.</p></div>;
}
