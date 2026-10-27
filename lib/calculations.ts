export const MAX_MONEY = 9_999_999_999.99;

export function toCents(amount: number) {
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_MONEY) throw new Error("Invalid monetary amount");
  const cents = Math.round((amount + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(cents)) throw new Error("Monetary amount exceeds the supported range");
  return cents;
}

export function lineTotal(unitPrice: number, quantity: number, discount = 0) {
  if (!Number.isFinite(unitPrice) || !Number.isSafeInteger(quantity) || unitPrice < 0 || quantity <= 0 || discount < 0) throw new Error("Invalid sale line");
  const grossCents = toCents(unitPrice) * quantity;
  const discountCents = toCents(discount);
  if (!Number.isSafeInteger(grossCents) || grossCents > toCents(MAX_MONEY)) throw new Error("Sale line exceeds the supported range");
  const totalCents = grossCents - discountCents;
  if (totalCents < 0) throw new Error("Discount exceeds line total");
  return totalCents / 100;
}
export function estimatedResult(revenue: number, recordedExpenses: number) {
  return Math.round((revenue - recordedExpenses) * 100) / 100;
}
