import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { inventoryAdjustmentSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = inventoryAdjustmentSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Revisá el artículo, la cantidad y el motivo." }, { status: 400 });
    const input = parsed.data;
    const delta = input.type === "ADJUSTMENT" ? input.quantity : -input.quantity;
    const isRemoval = delta < 0;

    const result = await db.$transaction(async (tx) => {
      const replay = await tx.inventoryMovement.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (replay) return { movement: replay, replay: true };

      if (input.variantId) {
        const variant = await tx.productVariant.findUnique({ where: { id: input.variantId }, select: { id: true, stock: true } });
        if (!variant) throw new Error("INVENTORY_ITEM_NOT_FOUND");
        const next = variant.stock + delta;
        if (!Number.isInteger(next) || next < 0) throw new Error("INSUFFICIENT_STOCK");
        const updated = await tx.productVariant.updateMany({ where: { id: variant.id, stock: { gte: isRemoval ? -delta : 0 } }, data: { stock: { increment: delta } } });
        if (updated.count !== 1) throw new Error("INSUFFICIENT_STOCK");
      } else {
        const ingredientId = input.ingredientId!;
        const ingredient = await tx.ingredient.findUnique({ where: { id: ingredientId }, select: { id: true, quantity: true } });
        if (!ingredient) throw new Error("INVENTORY_ITEM_NOT_FOUND");
        const next = Number(ingredient.quantity) + delta;
        if (!Number.isFinite(next) || next < 0) throw new Error("INSUFFICIENT_STOCK");
        const updated = await tx.ingredient.updateMany({ where: { id: ingredient.id, quantity: { gte: isRemoval ? -delta : 0 } }, data: { quantity: { increment: delta } } });
        if (updated.count !== 1) throw new Error("INSUFFICIENT_STOCK");
      }

      const movement = await tx.inventoryMovement.create({ data: {
        type: input.type,
        quantity: delta,
        note: input.note,
        userId: user.id,
        variantId: input.variantId,
        ingredientId: input.ingredientId,
        idempotencyKey: input.idempotencyKey,
      } });
      await tx.auditLog.create({ data: { userId: user.id, action: input.type, entityType: input.variantId ? "ProductVariant" : "Ingredient", entityId: input.variantId ?? input.ingredientId!, details: { quantity: delta, note: input.note } } });
      return { movement, replay: false };
    });
    return NextResponse.json(result, { status: result.replay ? 200 : 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") return NextResponse.json({ error: "El movimiento dejaría el inventario por debajo de cero." }, { status: 409 });
    if (error instanceof Error && error.message === "INVENTORY_ITEM_NOT_FOUND") return NextResponse.json({ error: "El artículo ya no está disponible." }, { status: 404 });
    return apiError(error);
  }
}
