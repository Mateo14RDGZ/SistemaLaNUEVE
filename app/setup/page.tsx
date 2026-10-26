import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
export default async function SetupPage() {
  if (await currentUser()) redirect("/");
  let hasUsers = false; try { hasUsers = (await db.user.count()) > 0; } catch { hasUsers = false; }
  if (hasUsers) redirect("/login");
  return <main className="page auth-wrap"><section className="auth-card"><div className="auth-emblem">9</div><div className="eyebrow">Preparación inicial</div><h1 className="page-title">Conectá LA NUEVE</h1><p className="page-subtitle">Configurá la base de datos y el usuario administrador inicial desde el entorno seguro. Después de completar esos pasos, volvé a iniciar sesión.</p><div className="card" style={{ marginTop: 20 }}><div className="row-title">Pasos para comenzar</div><ol className="row-sub" style={{ paddingLeft: 18, lineHeight: 1.9 }}><li>Creá una base PostgreSQL en Neon.</li><li>Configurá <code>DATABASE_URL</code> y <code>AUTH_SECRET</code>.</li><li>Ejecutá <code>npm run db:deploy</code>.</li><li>Definí el primer administrador y corré el seed.</li></ol></div></section></main>;
}
