import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { userCreateSchema } from "@/lib/validations";

export async function GET() {
  try {
    await requireAdmin();
    const users = await db.user.findMany({ select: { id: true, name: true, email: true, role: true, active: true, createdAt: true }, orderBy: { createdAt: "asc" } });
    return NextResponse.json(users);
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdmin();
    const parsed = userCreateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Completá nombre, correo y una contraseña de al menos 12 caracteres." }, { status: 400 });
    const input = parsed.data;
    const passwordHash = await bcrypt.hash(input.password, 12);
    const created = await db.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { name: input.name, email: input.email, passwordHash, role: input.role }, select: { id: true, name: true, email: true, role: true, active: true, createdAt: true } });
      await tx.auditLog.create({ data: { userId: actor.id, action: "CREATE", entityType: "User", entityId: user.id, details: { email: user.email, role: user.role } } });
      return user;
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) { return apiError(error); }
}
