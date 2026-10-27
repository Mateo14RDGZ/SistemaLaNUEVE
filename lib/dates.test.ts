import { describe, expect, it } from "vitest";
import { startOfUruguayDay, startOfUruguayMonth } from "@/lib/dates";

describe("Uruguay business date boundaries", () => {
  it("starts the business day at midnight in Uruguay", () => {
    expect(startOfUruguayDay(new Date("2026-10-27T02:59:59.000Z")).toISOString()).toBe("2026-10-26T03:00:00.000Z");
    expect(startOfUruguayDay(new Date("2026-10-27T03:00:00.000Z")).toISOString()).toBe("2026-10-27T03:00:00.000Z");
  });

  it("starts the business month at midnight in Uruguay", () => {
    expect(startOfUruguayMonth(new Date("2026-10-01T02:59:59.000Z")).toISOString()).toBe("2026-09-01T03:00:00.000Z");
    expect(startOfUruguayMonth(new Date("2026-10-01T03:00:00.000Z")).toISOString()).toBe("2026-10-01T03:00:00.000Z");
  });
});
