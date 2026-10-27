import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/http";

const schema = z.object({ reason: z.string().trim().min(3).max(300) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin();
    const { id } = await context.params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Indicá el motivo de la cancelación." }, { status: 400 });

    const result = await db.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id }, include: { items: true } });
      if (!sale) throw new Error("SALE_NOT_FOUND");
      if (sale.status === "CANCELLED") return { sale, replay: true };
      const changed = await tx.sale.updateMany({ where: { id, status: "COMPLETED" }, data: { status: "CANCELLED" } });
      if (changed.count !== 1) throw new Error("SALE_ALREADY_CANCELLED");
      for (const item of sale.items) {
        await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
        await tx.inventoryMovement.create({ data: {
          type: "RETURN",
          quantity: item.quantity,
          note: `Cancelación de venta ${sale.id}: ${parsed.data.reason}`,
          userId: user.id,
          variantId: item.variantId,
          saleItemId: item.id,
        } });
      }
      await tx.auditLog.create({ data: { userId: user.id, action: "CANCEL", entityType: "Sale", entityId: sale.id, details: { reason: parsed.data.reason, total: sale.total.toString() } } });
      return { sale: { ...sale, status: "CANCELLED" as const }, replay: false };
    });
    return NextResponse.json(result, { status: result.replay ? 200 : 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "SALE_NOT_FOUND") return NextResponse.json({ error: "No encontramos esa venta." }, { status: 404 });
    if (error instanceof Error && error.message === "SALE_ALREADY_CANCELLED") return NextResponse.json({ error: "La venta ya fue cancelada." }, { status: 409 });
    return apiError(error);
  }
}
