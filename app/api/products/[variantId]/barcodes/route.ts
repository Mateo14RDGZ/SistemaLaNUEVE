import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/http";

const schema = z.object({ value: z.string().trim().min(1).max(64) });

export async function POST(request: Request, context: { params: Promise<{ variantId: string }> }) {
  try {
    const user = await requireAdmin();
    const { variantId } = await context.params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "El código no es válido." }, { status: 400 });
    const barcode = await db.$transaction(async tx => {
      const variant = await tx.productVariant.findUnique({ where: { id: variantId }, select: { id: true } });
      if (!variant) throw new Error("VARIANT_NOT_FOUND");
      const created = await tx.barcode.create({ data: { value: parsed.data.value, variantId } });
      await tx.auditLog.create({ data: { userId: user.id, action: "BARCODE_ASSOCIATED", entityType: "ProductVariant", entityId: variantId, details: { barcodeId: created.id } } });
      return created;
    });
    return NextResponse.json(barcode, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "VARIANT_NOT_FOUND") return NextResponse.json({ error: "La presentación seleccionada no existe." }, { status: 404 });
    return apiError(error);
  }
}
