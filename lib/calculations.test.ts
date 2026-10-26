import { describe, expect, it } from "vitest";
import { estimatedResult, lineTotal } from "@/lib/calculations";
describe("business calculations", () => {
  it("calculates a sale line without floating point residue", () => { expect(lineTotal(145.5, 3)).toBe(436.5); });
  it("applies an authorized line discount", () => { expect(lineTotal(100, 2, 10)).toBe(190); });
  it("rejects discounts above the line amount", () => { expect(() => lineTotal(10, 1, 11)).toThrow(); });
  it("labels recorded result as revenue less recorded expenses", () => { expect(estimatedResult(1000, 300)).toBe(700); });
});
