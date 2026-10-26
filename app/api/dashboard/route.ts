import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
export async function GET() {
  try {
    await requireUser(); const now = new Date(); const day = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const month = new Date(now.getFullYear(), now.getMonth(), 1);
    const [todaySales, monthSales, monthExpenses, variants, batches, recentSales, recentExpenses] = await Promise.all([
      db.sale.aggregate({ where: { status: "COMPLETED", createdAt: { gte: day } }, _sum: { total: true }, _count: true }),
      db.sale.aggregate({ where: { status: "COMPLETED", createdAt: { gte: month } }, _sum: { total: true } }),
      db.expense.aggregate({ where: { date: { gte: month } }, _sum: { amount: true } }),
      db.productVariant.findMany({ include: { product: true }, orderBy: { product: { name: "asc" } } }),
      db.productionBatch.findMany({ where: { status: { in: ["PLANNED", "BREWING", "FERMENTING", "CONDITIONING", "BOTTLED"] } }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.sale.findMany({ include: { items: true }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.expense.findMany({ orderBy: { date: "desc" }, take: 5 })
    ]);
    const gross = Number(monthSales._sum.total || 0), expenses = Number(monthExpenses._sum.amount || 0);
    return NextResponse.json({ todayRevenue: Number(todaySales._sum.total || 0), todayUnits: todaySales._count, monthRevenue: gross, monthExpenses: expenses, estimatedGrossResult: gross - expenses, variants, batches, recentSales, recentExpenses });
  } catch (e) { return apiError(e); }
}
