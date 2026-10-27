"use client";

import { useState } from "react";

export function PasswordChangeForm() {
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError("");
    setSaved(false);
    setBusy(true);
    const form = new FormData(formElement);
    const currentPassword = String(form.get("currentPassword") || "");
    const newPassword = String(form.get("newPassword") || "");
    const confirmation = String(form.get("confirmation") || "");
    if (newPassword !== confirmation) {
      setError("Las contraseñas nuevas no coinciden.");
      setBusy(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo cambiar la contraseña.");
      formElement.reset();
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cambiar la contraseña.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form password-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="currentPassword">Contraseña actual</label>
        <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required maxLength={72} />
      </div>
      <div className="field">
        <label htmlFor="newPassword">Nueva contraseña</label>
        <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={9} maxLength={72} required />
        <span className="row-sub">Mínimo 9 caracteres para este cambio.</span>
      </div>
      <div className="field">
        <label htmlFor="confirmation">Repetí la nueva contraseña</label>
        <input id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={9} maxLength={72} required />
      </div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {saved && <div className="notice" role="status">Contraseña cambiada. Tu sesión sigue abierta.</div>}
      <button className="button" type="submit" disabled={busy}>
        {busy ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
