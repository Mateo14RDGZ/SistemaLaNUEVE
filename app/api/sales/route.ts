import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { saleSchema } from "@/lib/validations";
import { toCents } from "@/lib/calculations";
export async function GET() {
  try { await requireUser(); return NextResponse.json(await db.sale.findMany({ include: { items: true, user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 50 })); } catch (e) { return apiError(e); }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser(); const parsed = saleSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Revisá los datos de la venta." }, { status: 400 });
    const input = parsed.data;
    const result = await db.$transaction(async tx => {
      const existing = await tx.sale.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { items: true } });
      if (existing) return { sale: existing, replay: true };
      const ids = [...new Set(input.items.map(i => i.variantId))];
      const variants = await tx.productVariant.findMany({ where: { id: { in: ids }, commerciallyAvailable: true }, include: { product: true } });
      if (variants.length !== ids.length) throw new Error("VARIANT_UNAVAILABLE");
      const vmap = new Map(variants.map(v => [v.id, v]));
      let subtotalCents = 0;
      const lines = input.items.map(item => { const v = vmap.get(item.variantId)!; if (v.stock < item.quantity) throw new Error("INSUFFICIENT_STOCK"); const lineCents = toCents(Number(v.price)) * item.quantity; if (!Number.isSafeInteger(lineCents)) throw new Error("SALE_AMOUNT_LIMIT"); subtotalCents += lineCents; return { ...item, v, lineTotal: lineCents / 100 }; });
      const discountCents = toCents(input.discount);
      if (!Number.isSafeInteger(subtotalCents) || subtotalCents > toCents(9_999_999_999.99)) throw new Error("SALE_AMOUNT_LIMIT");
      if (discountCents > subtotalCents) throw new Error("INVALID_DISCOUNT");
      const subtotal = subtotalCents / 100;
      const total = (subtotalCents - discountCents) / 100;
      const sale = await tx.sale.create({ data: { idempotencyKey: input.idempotencyKey, userId: user.id, subtotal, discount: input.discount, total, paymentMethod: input.paymentMethod, items: { create: lines.map(line => ({ variantId: line.v.id, productNameSnapshot: line.v.product.name, variantLabelSnapshot: line.v.label, skuSnapshot: line.v.sku, unitPrice: line.v.price, quantity: line.quantity, lineTotal: line.lineTotal })) } }, include: { items: true } });
      for (const line of lines) {
        const updated = await tx.productVariant.updateMany({ where: { id: line.v.id, stock: { gte: line.quantity } }, data: { stock: { decrement: line.quantity } } });
        if (updated.count !== 1) throw new Error("INSUFFICIENT_STOCK");
        const saleItem = sale.items.find(i => i.variantId === line.v.id)!;
        await tx.inventoryMovement.create({ data: { type: "SALE", quantity: -line.quantity, userId: user.id, variantId: line.v.id, saleItemId: saleItem.id } });
      }
      await tx.payment.create({ data: { saleId: sale.id, amount: total, method: input.paymentMethod } });
      await tx.auditLog.create({ data: { userId: user.id, action: "CREATE", entityType: "Sale", entityId: sale.id } });
      return { sale, replay: false };
    });
    return NextResponse.json(result, { status: result.replay ? 200 : 201 });
    } catch (e) { if (e instanceof Error && e.message === "INSUFFICIENT_STOCK") return NextResponse.json({ error: "No hay stock suficiente para esa cantidad." }, { status: 409 }); if (e instanceof Error && e.message === "VARIANT_UNAVAILABLE") return NextResponse.json({ error: "La variante no está disponible para venta." }, { status: 409 }); if (e instanceof Error && e.message === "INVALID_DISCOUNT") return NextResponse.json({ error: "El descuento supera el subtotal." }, { status: 400 }); if (e instanceof Error && e.message === "SALE_AMOUNT_LIMIT") return NextResponse.json({ error: "El total de venta supera el límite admitido." }, { status: 400 }); return apiError(e); }
}
