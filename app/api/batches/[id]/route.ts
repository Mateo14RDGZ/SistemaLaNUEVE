import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/http";

const schema = z.object({
  status: z.enum(["BREWING", "FERMENTING", "CONDITIONING", "BOTTLED", "INTERNAL_TRIAL", "RELEASED", "DISCARDED"]),
  producedVolumeMl: z.number().int().positive().max(500_000).optional(),
  lossVolumeMl: z.number().int().nonnegative().max(500_000).optional(),
  variantId: z.string().min(1).optional(),
  sellableUnits: z.number().int().positive().max(100_000).optional(),
  notes: z.string().max(1000).optional(),
});

const nextStatuses: Record<string, string[]> = {
  PLANNED: ["BREWING", "DISCARDED"],
  BREWING: ["FERMENTING", "DISCARDED"],
  FERMENTING: ["CONDITIONING", "DISCARDED"],
  CONDITIONING: ["BOTTLED", "INTERNAL_TRIAL", "DISCARDED"],
  BOTTLED: ["INTERNAL_TRIAL", "RELEASED", "DISCARDED"],
  INTERNAL_TRIAL: ["RELEASED", "DISCARDED"],
  RELEASED: [],
  DISCARDED: [],
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Revisá el estado y los datos del lote." }, { status: 400 });
    const input = parsed.data;

    const batch = await db.$transaction(async (tx) => {
      const current = await tx.productionBatch.findUnique({ where: { id } });
      if (!current) throw new Error("BATCH_NOT_FOUND");
      if (current.status === input.status) return tx.productionBatch.findUniqueOrThrow({ where: { id }, include: { recipe: true, consumptions: { include: { ingredient: true } } } });
      if (!nextStatuses[current.status]?.includes(input.status)) throw new Error("INVALID_BATCH_TRANSITION");
      if (input.status === "BOTTLED" && (!input.producedVolumeMl || input.lossVolumeMl === undefined)) throw new Error("BOTTLING_DATA_REQUIRED");
      if (input.status === "RELEASED" && (!input.variantId || !input.sellableUnits)) throw new Error("RELEASE_DATA_REQUIRED");

      const changed = await tx.productionBatch.updateMany({
        where: { id, status: current.status },
        data: {
          status: input.status,
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          ...(input.producedVolumeMl !== undefined ? { producedVolumeMl: input.producedVolumeMl } : {}),
          ...(input.lossVolumeMl !== undefined ? { lossVolumeMl: input.lossVolumeMl } : {}),
          ...(input.status === "BREWING" ? { startedAt: new Date() } : {}),
          ...(input.status === "BOTTLED" ? { bottledAt: new Date() } : {}),
          ...(input.status === "RELEASED" ? { releasedAt: new Date(), sellableUnits: input.sellableUnits! } : {}),
        },
      });
      if (changed.count !== 1) throw new Error("BATCH_STATE_CHANGED");

      if (input.status === "RELEASED") {
        const variant = await tx.productVariant.findUnique({ where: { id: input.variantId! }, include: { product: true } });
        if (!variant) throw new Error("VARIANT_NOT_FOUND");
        await tx.productVariant.update({ where: { id: variant.id }, data: { stock: { increment: input.sellableUnits! } } });
        await tx.inventoryMovement.create({ data: {
          type: "PRODUCTION",
          quantity: input.sellableUnits!,
          note: `Liberación del lote ${current.code}`,
          userId: user.id,
          variantId: variant.id,
          batchId: current.id,
        } });
      }
      await tx.auditLog.create({ data: { userId: user.id, action: "STATUS_CHANGE", entityType: "ProductionBatch", entityId: id, details: { from: current.status, to: input.status, producedVolumeMl: input.producedVolumeMl, lossVolumeMl: input.lossVolumeMl, variantId: input.variantId, sellableUnits: input.sellableUnits } } });
      return tx.productionBatch.findUniqueOrThrow({ where: { id }, include: { recipe: true, consumptions: { include: { ingredient: true } } } });
    });
    return NextResponse.json(batch);
  } catch (error) {
    if (error instanceof Error && error.message === "BATCH_NOT_FOUND") return NextResponse.json({ error: "No encontramos ese lote." }, { status: 404 });
    if (error instanceof Error && error.message === "INVALID_BATCH_TRANSITION") return NextResponse.json({ error: "Ese cambio de estado no está permitido para el lote." }, { status: 409 });
    if (error instanceof Error && error.message === "BOTTLING_DATA_REQUIRED") return NextResponse.json({ error: "Indicá volumen producido y merma para embotellar." }, { status: 400 });
    if (error instanceof Error && error.message === "RELEASE_DATA_REQUIRED") return NextResponse.json({ error: "Elegí una presentación y las unidades que se liberan al stock." }, { status: 400 });
    if (error instanceof Error && error.message === "VARIANT_NOT_FOUND") return NextResponse.json({ error: "La presentación seleccionada no existe." }, { status: 404 });
    if (error instanceof Error && error.message === "BATCH_STATE_CHANGED") return NextResponse.json({ error: "El lote cambió en otra sesión. Actualizá e intentá de nuevo." }, { status: 409 });
    return apiError(error);
  }
}
