export function lineTotal(unitPrice: number, quantity: number, discount = 0) {
  if (!Number.isFinite(unitPrice) || !Number.isFinite(quantity) || unitPrice < 0 || quantity <= 0 || discount < 0) throw new Error("Invalid sale line");
  const total = Math.round((unitPrice * quantity - discount) * 100) / 100;
  if (total < 0) throw new Error("Discount exceeds line total");
  return total;
}
export function estimatedResult(revenue: number, recordedExpenses: number) {
  return Math.round((revenue - recordedExpenses) * 100) / 100;
}
