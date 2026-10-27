import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { purchaseSchema } from "@/lib/validations";
import { z } from "zod";
import { toCents } from "@/lib/calculations";
export async function POST(request: Request) {
  try {
    const user = await requireUser(); const parsed = z.object({ idempotencyKey: z.uuid(), purchase: purchaseSchema }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Revisá los datos de la compra." }, { status: 400 });
    const { idempotencyKey, purchase: d } = parsed.data;
    const purchase = await db.$transaction(async tx => {
      const prior = await tx.inventoryMovement.findFirst({ where: { idempotencyKey }, include: { purchaseItem: { include: { purchase: { include: { items: true } } } } } });
      if (prior?.purchaseItem?.purchase) return prior.purchaseItem.purchase;
      const supplier = d.supplierName ? await tx.supplier.upsert({ where: { name: d.supplierName }, update: {}, create: { name: d.supplierName } }) : null;
      const items = [] as { ingredientId: string; quantity: number; unitCost: number; total: number }[];
      let totalCents = 0;
      for (const item of d.items) {
        let ingredient = await tx.ingredient.findFirst({ where: { name: item.ingredientName, unit: item.unit } });
        if (!ingredient) ingredient = await tx.ingredient.create({ data: { name: item.ingredientName, unit: item.unit } });
        const lineCents = toCents(item.quantity * item.unitCost);
        totalCents += lineCents;
        if (!Number.isSafeInteger(totalCents)) throw new Error("PURCHASE_AMOUNT_LIMIT");
        await tx.ingredient.update({ where: { id: ingredient.id }, data: { quantity: { increment: item.quantity }, unitCost: item.unitCost } });
        items.push({ ingredientId: ingredient.id, quantity: item.quantity, unitCost: item.unitCost, total: lineCents / 100 });
      }
      if (totalCents > toCents(9_999_999_999.99)) throw new Error("PURCHASE_AMOUNT_LIMIT");
      const total = totalCents / 100;
      const created = await tx.purchase.create({ data: { supplierId: supplier?.id, userId: user.id, total, paymentMethod: d.paymentMethod, detail: d.detail, items: { create: items } }, include: { items: true } });
      for (const [index, item] of created.items.entries()) await tx.inventoryMovement.create({ data: { type: "PURCHASE", quantity: item.quantity, userId: user.id, ingredientId: item.ingredientId, purchaseItemId: item.id, idempotencyKey: index === 0 ? idempotencyKey : undefined } });
      await tx.expense.create({ data: { category: "Compra de insumos", amount: total, paymentMethod: d.paymentMethod, detail: d.detail, supplierId: supplier?.id, userId: user.id, purchaseId: created.id } });
      await tx.auditLog.create({ data: { userId: user.id, action: "CREATE", entityType: "Purchase", entityId: created.id } });
      return created;
    });
    return NextResponse.json(purchase, { status: 201 });
  } catch (e) { if (e instanceof Error && e.message === "PURCHASE_AMOUNT_LIMIT") return NextResponse.json({ error: "El total de la compra supera el límite admitido." }, { status: 400 }); return apiError(e); }
}
