import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { expenseSchema } from "@/lib/validations";
export async function GET() {
  try { await requireUser(); return NextResponse.json(await db.expense.findMany({ orderBy: { date: "desc" }, take: 100 })); } catch (e) { return apiError(e); }
}
export async function POST(request: Request) {
  try { const user = await requireUser(); const parsed = expenseSchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Revisá los datos del gasto." }, { status: 400 }); const d = parsed.data; const result = await db.$transaction(async tx => { const expense = await tx.expense.create({ data: { ...d, userId: user.id } }); await tx.auditLog.create({ data: { userId: user.id, action: "CREATE", entityType: "Expense", entityId: expense.id } }); return expense; }); return NextResponse.json(result, { status: 201 }); } catch (e) { return apiError(e); }
}
