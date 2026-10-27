import { redirect } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { PasswordChangeForm } from "@/components/password-change-form";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <main className="page">
      <h1 className="page-title">Mi cuenta</h1>
      <p className="page-subtitle">Datos de acceso y seguridad de tu sesión.</p>

      <section className="account-summary" aria-label="Datos de la cuenta">
        <span className="account-avatar" aria-hidden="true">{user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
        <div className="row-main">
          <span className="row-title">{user.name}</span>
          <span className="row-sub">{user.email}</span>
          <span className="account-role">{user.role === "ADMIN" ? "Administrador" : "Operador"}</span>
        </div>
      </section>

      <div className="section-heading"><h2>Contraseña</h2></div>
      <section className="card account-password-card">
        <div className="account-section-heading">
          <span className="account-section-icon"><KeyRound size={17} aria-hidden="true" /></span>
          <div>
            <h3>Cambiar contraseña</h3>
            <p>Se verifica la contraseña actual antes de guardar la nueva.</p>
          </div>
        </div>
        <PasswordChangeForm />
      </section>

      <p className="account-security-note"><ShieldCheck size={15} aria-hidden="true" /> La contraseña se guarda como hash; nunca se almacena en texto visible.</p>
    </main>
  );
}
