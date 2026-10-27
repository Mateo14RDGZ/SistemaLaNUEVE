"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Beer,
  ChevronRight,
  CircleDollarSign,
  FlaskConical,
  Home,
  Menu,
  Package,
  ReceiptText,
  ScanLine,
  ShoppingCart,
  UserRound,
  WifiOff,
  X,
} from "lucide-react";
import { Scanner } from "@/components/scanner";

type User = { name: string; email: string; role: string };
type NavigationItem = { href: string; label: string; icon: typeof Home };

const navigationGroups: { label: string; items: NavigationItem[] }[] = [
  {
    label: "Principal",
    items: [
      { href: "/", label: "Inicio", icon: Home },
      { href: "/ventas", label: "Ventas", icon: ReceiptText },
      { href: "/stock", label: "Inventario", icon: Package },
    ],
  },
  {
    label: "Operación",
    items: [
      { href: "/compras", label: "Compras", icon: ShoppingCart },
      { href: "/gastos", label: "Gastos", icon: CircleDollarSign },
      { href: "/lotes", label: "Elaboración", icon: FlaskConical },
      { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/cuenta", label: "Mi cuenta", icon: UserRound },
      { href: "/mas", label: "Más opciones", icon: ChevronRight },
    ],
  },
];

function Brand() {
  return (
    <span className="brand-lockup">
      <span className="brand-seal" aria-hidden="true">9</span>
      <span className="brand-copy">
        <span className="brand-name">LA NUEVE</span>
        <span className="brand-tagline">QUE HABLE LO QUE HACEMOS.</span>
      </span>
    </span>
  );
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function Sidebar({
  user,
  pathname,
  onNavigate,
  onLogout,
  mobile = false,
}: {
  user: User;
  pathname: string;
  onNavigate?: () => void;
  onLogout: () => void;
  mobile?: boolean;
}) {
  return (
    <div className={`sidebar-content${mobile ? " sidebar-content-mobile" : ""}`}>
      <Link href="/" className="sidebar-brand" onClick={onNavigate} aria-label="LA NUEVE, inicio">
        <Brand />
      </Link>

      <Link href="/ventas" className="sidebar-primary-action" onClick={onNavigate}>
        <ScanLine size={18} strokeWidth={2} />
        <span>Registrar una venta</span>
      </Link>

      <nav className="sidebar-navigation" aria-label="Navegación principal">
        {navigationGroups.map((group) => (
          <section className="sidebar-group" key={group.label} aria-label={group.label}>
            <h2 className="sidebar-group-label">{group.label}</h2>
            <div className="sidebar-group-items">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`sidebar-link${active ? " active" : ""}`}
                  >
                    <Icon size={17} strokeWidth={active ? 2.1 : 1.9} aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <span className="user-avatar" aria-hidden="true">{initials(user.name)}</span>
          <span className="user-copy">
            <span className="user-name">{user.name}</span>
            <span className="user-role">{user.role === "ADMIN" ? "Administrador" : "Operador"}</span>
          </span>
          <button type="button" className="logout-button" onClick={onLogout} aria-label="Cerrar sesión">
            Salir
          </button>
        </div>
        <p className="sidebar-origin"><Beer size={13} aria-hidden="true" /> Trinidad, Flores · Uruguay</p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [scanner, setScanner] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (alive) setUser(data?.user ?? null); })
      .catch(() => {})
      .finally(() => { if (alive) setChecked(true); });
    const updateConnection = () => setOnline(navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      alive = false;
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, [pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  async function logout() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) return;
    setUser(null);
    router.push("/login");
  }

  if (pathname === "/login" || pathname === "/setup") return <>{children}</>;
  if (!checked) return <div className="loading">Abriendo LA NUEVE…</div>;
  if (!user) return <>{children}</>;

  return (
    <div className="app-layout">
      <aside className="desktop-sidebar" aria-label="Menú de LA NUEVE">
        <Sidebar user={user} pathname={pathname} onLogout={logout} />
      </aside>

      <div className="app-main">
        <header className="mobile-header">
          <button
            ref={menuButton}
            type="button"
            className="header-icon-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir navegación"
            aria-expanded={menuOpen}
          >
            <Menu size={21} strokeWidth={2} />
          </button>
          <Link href="/" className="mobile-brand" aria-label="LA NUEVE, inicio"><Brand /></Link>
          <button
            type="button"
            className="header-icon-button header-scan-button"
            onClick={() => setScanner(true)}
            aria-label="Escanear código para una venta"
          >
            <ScanLine size={20} strokeWidth={2} />
          </button>
        </header>

        {!online && (
          <div className="connection-notice" role="status">
            <WifiOff size={15} aria-hidden="true" />
            Sin conexión. Las operaciones se habilitan al recuperar Internet.
          </div>
        )}

        <main className="app-content">{children}</main>
      </div>

      {menuOpen && (
        <div className="mobile-drawer-layer">
          <button className="drawer-scrim" type="button" aria-label="Cerrar navegación" onClick={() => setMenuOpen(false)} />
          <aside className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Navegación principal">
            <button type="button" className="drawer-close header-icon-button" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
              <X size={19} />
            </button>
            <Sidebar user={user} pathname={pathname} onNavigate={() => setMenuOpen(false)} onLogout={logout} mobile />
          </aside>
        </div>
      )}

      {scanner && (
        <div className="backdrop" onClick={() => setScanner(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Venta rápida: leer código" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-heading">
              <div>
                <h2 className="sheet-title">Leer código</h2>
                <p className="sheet-subtitle">Escaneá un producto para iniciar una venta.</p>
              </div>
              <button className="header-icon-button" aria-label="Cerrar escáner" onClick={() => setScanner(false)}>
                <X size={18} />
              </button>
            </div>
            <Scanner online={online} onDone={() => { setScanner(false); router.refresh(); }} />
          </div>
        </div>
      )}
    </div>
  );
}
