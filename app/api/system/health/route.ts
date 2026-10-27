import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/http";

export async function GET() {
  try {
    await requireAdmin();
    const migrations = await db.$queryRaw<Array<{ migration_name: string; finished_at: Date }>>`
      SELECT migration_name, finished_at
      FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      ORDER BY finished_at DESC
    `;
    return NextResponse.json({
      status: "ok",
      database: "connected",
      migrations: { applied: migrations.length, latest: migrations[0]?.migration_name ?? null },
      sessionSigningKey: Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32),
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return apiError(error);
    if (error instanceof Error && error.message === "FORBIDDEN") return apiError(error);
    if (error instanceof Error && /_prisma_migrations/.test(error.message)) return NextResponse.json({ status: "error", database: "connected", migrations: { status: "missing" }, error: "No se encontró el registro de migraciones de Prisma." }, { status: 503 });
    return apiError(error);
  }
}
