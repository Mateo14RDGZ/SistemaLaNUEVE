import { z } from "zod";
export const paymentMethod = z.enum(["CASH", "TRANSFER", "CARD", "OTHER"]);
export const loginSchema = z.object({ email: z.email().transform(v => v.toLowerCase()), password: z.string().min(1).max(128) });
export const productSchema = z.object({ name: z.string().trim().min(1).max(100), beerType: z.string().trim().min(1).max(60), style: z.string().max(100).optional(), flavorProfile: z.string().max(200).optional(), description: z.string().max(1000).optional(), sku: z.string().trim().min(1).max(40), barcode: z.string().trim().max(64).optional(), volumeMl: z.number().int().positive().max(20000), price: z.number().nonnegative().max(9_999_999_999.99), stock: z.number().int().nonnegative().max(2_000_000_000).default(0), minimumStock: z.number().int().nonnegative().max(2_000_000_000).default(0), commerciallyAvailable: z.boolean().default(false) });
export const saleSchema = z.object({ idempotencyKey: z.uuid(), paymentMethod, items: z.array(z.object({ variantId: z.string().min(1), quantity: z.number().int().positive().max(999) })).min(1).max(50), discount: z.number().nonnegative().max(9_999_999_999.99).default(0) });
export const purchaseSchema = z.object({ supplierName: z.string().trim().min(1).max(120).optional(), paymentMethod, detail: z.string().max(500).optional(), items: z.array(z.object({ ingredientName: z.string().trim().min(1).max(120), unit: z.string().trim().min(1).max(20), quantity: z.number().positive().max(99_999_999_999.999), unitCost: z.number().nonnegative().max(9_999_999_999.99) })).min(1).max(50) });
export const expenseSchema = z.object({ category: z.string().trim().min(1).max(80), amount: z.number().positive().max(9_999_999_999.99), paymentMethod, detail: z.string().max(500).optional() });
export const inventoryAdjustmentSchema = z.object({
  idempotencyKey: z.uuid(),
  variantId: z.string().min(1).optional(),
  ingredientId: z.string().min(1).optional(),
  type: z.enum(["ADJUSTMENT", "WASTE", "BREAKAGE"]),
  quantity: z.number().min(-1_000_000).max(1_000_000).refine(value => value !== 0),
  note: z.string().trim().min(3).max(300),
}).refine((value) => Boolean(value.variantId) !== Boolean(value.ingredientId), {
  message: "Elegí un único artículo del inventario.",
}).refine((value) => value.type === "ADJUSTMENT" || value.quantity > 0, {
  message: "Las mermas y roturas se expresan como cantidad positiva.",
}).refine((value) => !value.variantId || Number.isInteger(value.quantity), {
  message: "Las cantidades de cerveza embotellada deben ser unidades enteras.",
});
export const userCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().pipe(z.email()).transform(value => value.toLowerCase()),
  password: z.string().min(12).max(128),
  role: z.enum(["ADMIN", "OPERATOR"]).default("OPERATOR"),
});
