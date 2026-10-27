import { describe, expect, it } from "vitest";
import { inventoryAdjustmentSchema, userCreateSchema } from "@/lib/validations";

const key = "123e4567-e89b-42d3-a456-426614174000";

describe("operational input validation", () => {
  it("allows an adjustment for exactly one inventory target", () => {
    expect(inventoryAdjustmentSchema.safeParse({ idempotencyKey: key, variantId: "beer-1", type: "ADJUSTMENT", quantity: -2, note: "Conteo físico" }).success).toBe(true);
  });

  it("rejects inventory changes that target zero or two items", () => {
    expect(inventoryAdjustmentSchema.safeParse({ idempotencyKey: key, type: "ADJUSTMENT", quantity: 2, note: "Conteo físico" }).success).toBe(false);
    expect(inventoryAdjustmentSchema.safeParse({ idempotencyKey: key, variantId: "beer-1", ingredientId: "malt-1", type: "ADJUSTMENT", quantity: 2, note: "Conteo físico" }).success).toBe(false);
  });

  it("requires whole bottle counts and positive waste inputs", () => {
    expect(inventoryAdjustmentSchema.safeParse({ idempotencyKey: key, variantId: "beer-1", type: "ADJUSTMENT", quantity: 1.5, note: "Conteo físico" }).success).toBe(false);
    expect(inventoryAdjustmentSchema.safeParse({ idempotencyKey: key, ingredientId: "malt-1", type: "WASTE", quantity: -1, note: "Insumo dañado" }).success).toBe(false);
  });

  it("normalizes account email and requires a strong initial password length", () => {
    expect(userCreateSchema.parse({ name: "Mateo", email: " Mateo@Example.com ", password: "a-long-test-password", role: "ADMIN" }).email).toBe("mateo@example.com");
    expect(userCreateSchema.safeParse({ name: "Mateo", email: "mateo@example.com", password: "short" }).success).toBe(false);
  });
});
