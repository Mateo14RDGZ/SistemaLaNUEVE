import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/http";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin();
    const { id } = await context.params;
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || !("active" in body) || typeof body.active !== "boolean") {
      return NextResponse.json({ error: "Indicá si el acceso debe quedar activo." }, { status: 400 });
    }
    const active = body.active;
    if (!active && id === actor.id) return NextResponse.json({ error: "No podés desactivar tu propio acceso." }, { status: 409 });
    const user = await db.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id } });
      if (!target) throw new Error("USER_NOT_FOUND");
      if (!active && target.role === "ADMIN") {
        const activeAdmins = await tx.user.count({ where: { active: true, role: "ADMIN" } });
        if (activeAdmins <= 1) throw new Error("LAST_ADMIN");
      }
      const updated = await tx.user.update({ where: { id }, data: { active }, select: { id: true, name: true, email: true, role: true, active: true, createdAt: true } });
      await tx.auditLog.create({ data: { userId: actor.id, action: active ? "ACTIVATE" : "DEACTIVATE", entityType: "User", entityId: id, details: { email: target.email } } });
      return updated;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") return NextResponse.json({ error: "No encontramos ese usuario." }, { status: 404 });
    if (error instanceof Error && error.message === "LAST_ADMIN") return NextResponse.json({ error: "Debe quedar al menos un administrador activo." }, { status: 409 });
    return apiError(error);
  }
}
