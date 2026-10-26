import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL es obligatorio.");
  const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: url }) });
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) throw new Error("Configurá INITIAL_ADMIN_EMAIL y una INITIAL_ADMIN_PASSWORD de al menos 12 caracteres.");
  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.upsert({ where: { email: email.toLowerCase() }, update: {}, create: { name: process.env.INITIAL_ADMIN_NAME || "Administrador", email: email.toLowerCase(), passwordHash, role: "ADMIN" } });
  await db.$disconnect();
}
main().catch(error => { console.error(error); process.exit(1); });
