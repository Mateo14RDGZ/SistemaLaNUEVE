"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus, Users, ShieldCheck, Database, RefreshCw } from "lucide-react";
type TeamUser = { id: string; name: string; email: string; role: "ADMIN" | "OPERATOR"; active: boolean; createdAt: string };
type Health = { status: string; database: string; migrations: { applied: number; latest: string | null }; sessionSigningKey: boolean; checkedAt: string };

export default function TeamPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const [usersResponse, healthResponse] = await Promise.all([fetch("/api/users"), fetch("/api/system/health")]);
      const userData = await usersResponse.json();
      if (!usersResponse.ok) throw new Error(userData.error || "No se pudo cargar el equipo.");
      setUsers(userData);
      if (healthResponse.ok) setHealth(await healthResponse.json());
      else setHealth(null);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar el equipo."); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setSaved("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password"), role: form.get("role") }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "No se pudo crear el acceso.");
      formElement.reset(); setSaved(`Acceso creado para ${data.name}. Compartile la contraseña de forma privada.`); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo crear el acceso."); }
    finally { setSaving(false); }
  }

  async function toggle(user: TeamUser) {
    setError(""); setSaved("");
    if (user.active && !window.confirm(`¿Desactivar el acceso de ${user.name}? Se cerrará en su próximo pedido.`)) return;
    try {
      const response = await fetch(`/api/users/${user.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ active: !user.active }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "No se pudo actualizar el acceso.");
      setSaved(user.active ? `Se desactivó el acceso de ${user.name}.` : `Se reactivó el acceso de ${user.name}.`); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo actualizar el acceso."); }
  }

  return <main className="page">
    <div className="eyebrow">Administración</div><h1 className="page-title">Equipo</h1><p className="page-subtitle">Accesos individuales y estado de la base de LA NUEVE.</p>
    <div className="section-heading"><h2><Users size={17}/> Personas</h2><button className="button ghost" onClick={() => void load()} disabled={busy} aria-label="Actualizar equipo"><RefreshCw size={15}/></button></div>
    {error && <div className="notice error" role="alert">{error}</div>}{saved && <div className="notice" role="status">{saved}</div>}
    {busy && users.length === 0 ? <div className="loading">Cargando equipo…</div> : <div className="card">{users.map(user => <div className="list-row" key={user.id}><span className="row-main"><span className="row-title">{user.name}</span><span className="row-sub">{user.email} · {user.role === "ADMIN" ? "Administrador" : "Operador"}</span></span><span className="actions"><span className={`badge ${user.active ? "" : "danger"}`}>{user.active ? "Activo" : "Inactivo"}</span><button className={`button ${user.active ? "ghost" : "secondary"}`} style={{ minHeight: 36, padding: "0 10px" }} onClick={() => void toggle(user)}>{user.active ? "Desactivar" : "Reactivar"}</button></span></div>)}</div>}
    <div className="section-heading"><h2><UserPlus size={17}/> Agregar persona</h2></div>
    <form className="card form" onSubmit={create}>
      <div className="field"><label htmlFor="team-name">Nombre</label><input id="team-name" name="name" autoComplete="name" required minLength={2} maxLength={100}/></div>
      <div className="field"><label htmlFor="team-email">Correo de acceso</label><input id="team-email" name="email" type="email" autoComplete="email" required maxLength={254}/></div>
      <div className="field"><label htmlFor="team-password">Contraseña inicial</label><input id="team-password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/><span className="row-sub">Mínimo 12 caracteres. Compartila por un canal privado.</span></div>
      <div className="field"><label htmlFor="team-role">Permiso</label><select id="team-role" name="role" defaultValue="OPERATOR"><option value="OPERATOR">Operador · ventas y registro diario</option><option value="ADMIN">Administrador · gestión completa</option></select></div>
      <button className="button full" disabled={saving}>{saving ? "Creando acceso…" : "Crear acceso"}</button>
    </form>
    <div className="section-heading"><h2><Database size={17}/> Estado de datos</h2><button className="button ghost" onClick={() => void load()} disabled={busy}>Comprobar</button></div>
    {!health ? <div className="notice error">No se pudo leer el estado de la base o las migraciones.</div> : <div className="card system-health"><div className="top-line"><span className="actions"><span className="health-dot"/><b>Base de datos conectada</b></span><span className="badge">Operativa</span></div><div className="list-row"><span className="row-main"><span className="row-title">Migraciones aplicadas</span><span className="row-sub">Más reciente: {health.migrations.latest || "ninguna"}</span></span><span className="row-value">{health.migrations.applied}</span></div><div className="list-row"><span className="actions"><ShieldCheck size={16} color="var(--brand)"/><span className="row-title">Firma de sesión</span></span><span className={`badge ${health.sessionSigningKey ? "" : "danger"}`}>{health.sessionSigningKey ? "Configurada" : "Falta"}</span></div><div className="row-sub">Comprobado {new Date(health.checkedAt).toLocaleString("es-UY")}</div></div>}
    <p className="footer-note">Los accesos se registran individualmente y cada alta o baja queda auditada. La aplicación no muestra contraseñas después de crearlas.</p>
  </main>;
}
