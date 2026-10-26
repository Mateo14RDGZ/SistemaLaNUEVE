import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { apiError } from "@/lib/http";
export async function POST(request: Request) {
  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Revisá el correo y la contraseña." }, { status: 400 });
    const user = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !user.active || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (e) { return apiError(e); }
}
