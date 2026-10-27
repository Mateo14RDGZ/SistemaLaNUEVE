import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: z.string().min(10).max(72),
});

export async function POST(request: Request) {
  try {
    const parsed = changePasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "La contraseña nueva debe tener entre 10 y 72 caracteres." }, { status: 400 });
    }

    const sessionUser = await requireUser();
    const user = await db.user.findUnique({ where: { id: sessionUser.id } });
    if (!user || !user.active || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: "La contraseña actual no es correcta." }, { status: 401 });
    }
    if (await bcrypt.compare(parsed.data.newPassword, user.passwordHash)) {
      return NextResponse.json({ error: "Elegí una contraseña distinta a la actual." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { passwordHash } }),
      db.auditLog.create({
        data: { userId: user.id, action: "PASSWORD_CHANGED", entityType: "USER", entityId: user.id },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
