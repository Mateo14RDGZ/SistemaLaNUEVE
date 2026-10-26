"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Package, ScanLine, ReceiptText, Menu, X, WifiOff } from "lucide-react";
import { Scanner } from "@/components/scanner";

type User = { name: string; email: string; role: string };
const nav = [{ href: "/", label: "Inicio", icon: Home }, { href: "/ventas", label: "Ventas", icon: ReceiptText }, { href: "/stock", label: "Stock", icon: Package }, { href: "/gastos", label: "Gastos", icon: ReceiptText }, { href: "/mas", label: "Más", icon: Menu }];
export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [checked, setChecked] = useState(false); const [scanner, setScanner] = useState(false); const [online, setOnline] = useState(true); const pathname = usePathname(); const router = useRouter();
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(d => { if (alive) setUser(d?.user ?? null); }).catch(() => {}).finally(() => { if (alive) setChecked(true); });
    const update = () => setOnline(navigator.onLine); update(); window.addEventListener("online", update); window.addEventListener("offline", update);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => { alive = false; window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, [pathname]);
  async function logout() { const response = await fetch("/api/auth/logout", { method: "POST" }); if (!response.ok) return; setUser(null); router.push("/login"); }
  if (pathname === "/login" || pathname === "/setup") return <>{children}</>;
  if (!checked) return <div className="loading">Abriendo LA NUEVE…</div>;
  if (!user) return <>{children}</>;
  return <>
    <header className="app-header"><div className="header-inner"><Link href="/" className="brand-lockup"><span className="brand-seal">9</span><span><span className="brand-name">LA NUEVE</span><span className="brand-tagline" style={{ display: "block" }}>QUE HABLE LO QUE HACEMOS.</span></span></Link><button aria-label="Cerrar sesión" onClick={logout} className="header-user">{user.name.split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase()}<span className="muted" style={{ display: "none" }}>{user.role}</span></button></div></header>
    {!online && <div className="notice error" style={{ margin: "9px 18px 0", maxWidth: 680, marginInline: "auto", display: "flex", justifyContent: "center", gap: 6 }}><WifiOff size={15}/> Sin conexión: las operaciones de escritura están deshabilitadas.</div>}
    {children}
    <nav className="bottom-nav"><div className="bottom-inner">{nav.slice(0, 2).map(item => <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href ? "active" : ""}`}><item.icon/><span>{item.label}</span></Link>)}<button className="nav-scan" aria-label="Escanear o registrar venta" onClick={() => setScanner(true)}><ScanLine/></button>{nav.slice(2).map(item => <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href ? "active" : ""}`}><item.icon/><span>{item.label}</span></Link>)}</div></nav>
    {scanner && <div className="backdrop" onClick={() => setScanner(false)}><div className="sheet" onClick={e => e.stopPropagation()}><div className="sheet-handle"/><div className="top-line"><div><div className="eyebrow">Venta rápida</div><div className="page-title" style={{ fontSize: 24 }}>Leer código</div></div><button className="button ghost" aria-label="Cerrar" onClick={() => setScanner(false)}><X size={17}/></button></div><Scanner online={online} onDone={() => { setScanner(false); router.refresh(); }}/></div></div>}
  </>;
}
