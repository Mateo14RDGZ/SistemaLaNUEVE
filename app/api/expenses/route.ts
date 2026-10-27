import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { expenseSchema } from "@/lib/validations";
import { z } from "zod";
export async function GET() {
  try { await requireUser(); return NextResponse.json(await db.expense.findMany({ orderBy: { date: "desc" }, take: 100 })); } catch (e) { return apiError(e); }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = z.object({ idempotencyKey: z.uuid(), expense: expenseSchema }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Revisá los datos del gasto." }, { status: 400 });
    const { idempotencyKey, expense: input } = parsed.data;
    const ledgerKey = `expense-idempotency:${idempotencyKey}`;
    const create = () => db.$transaction(async tx => {
      const prior = await tx.setting.findUnique({ where: { key: ledgerKey } });
      if (prior && typeof prior.value === "object" && prior.value !== null && "expenseId" in prior.value && typeof prior.value.expenseId === "string") {
        const existing = await tx.expense.findUnique({ where: { id: prior.value.expenseId } });
        if (existing) return { expense: existing, replay: true };
      }
      const expense = await tx.expense.create({ data: { ...input, userId: user.id } });
      await tx.setting.create({ data: { key: ledgerKey, value: { expenseId: expense.id } } });
      await tx.auditLog.create({ data: { userId: user.id, action: "CREATE", entityType: "Expense", entityId: expense.id } });
      return { expense, replay: false };
    });
    let result;
    try { result = await create(); }
    catch (error) {
      if (!(typeof error === "object" && error !== null && "code" in error && error.code === "P2002")) throw error;
      const prior = await db.setting.findUnique({ where: { key: ledgerKey } });
      if (!prior || typeof prior.value !== "object" || prior.value === null || !("expenseId" in prior.value) || typeof prior.value.expenseId !== "string") throw error;
      const expense = await db.expense.findUnique({ where: { id: prior.value.expenseId } });
      if (!expense) throw error;
      result = { expense, replay: true };
    }
    return NextResponse.json(result, { status: result.replay ? 200 : 201 });
  } catch (e) { return apiError(e); }
}
