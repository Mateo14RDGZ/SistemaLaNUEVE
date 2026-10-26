import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
export async function GET() {
  try { await requireUser(); const [variants, ingredients, movements] = await Promise.all([db.productVariant.findMany({ include: { product: true }, orderBy: { product: { name: "asc" } } }), db.ingredient.findMany({ orderBy: { name: "asc" } }), db.inventoryMovement.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { user: { select: { name: true } }, variant: { include: { product: true } }, ingredient: true } })]); return NextResponse.json({ variants, ingredients, movements }); } catch (e) { return apiError(e); }
}
