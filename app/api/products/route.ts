import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { productSchema } from "@/lib/validations";
export async function GET() {
  try { await requireUser(); const products = await db.product.findMany({ include: { variants: { include: { barcodes: true }, orderBy: { volumeMl: "asc" } } }, orderBy: { createdAt: "desc" } }); return NextResponse.json(products); }
  catch (e) { return apiError(e); }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser(); const parsed = productSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Revisá los campos del producto." }, { status: 400 });
    const d = parsed.data;
    const result = await db.$transaction(async tx => {
      const product = await tx.product.create({ data: { name: d.name, beerType: d.beerType, style: d.style, flavorProfile: d.flavorProfile, description: d.description, status: d.commerciallyAvailable ? "ACTIVE" : "DRAFT", variants: { create: { label: `${d.volumeMl} ml`, volumeMl: d.volumeMl, sku: d.sku, price: d.price, stock: d.stock, minimumStock: d.minimumStock, commerciallyAvailable: d.commerciallyAvailable, ...(d.barcode ? { barcodes: { create: { value: d.barcode } } } : {}) } } }, include: { variants: true } });
      if (d.stock > 0) await tx.inventoryMovement.create({ data: { type: "ADJUSTMENT", quantity: d.stock, note: "Saldo inicial registrado al crear variante", userId: user.id, variantId: product.variants[0].id } });
      await tx.auditLog.create({ data: { userId: user.id, action: "CREATE", entityType: "Product", entityId: product.id } }); return product;
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) { return apiError(e); }
}
