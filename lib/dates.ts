const BUSINESS_TIME_ZONE = "America/Montevideo";

function partsInBusinessTimeZone(date: Date) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: BUSINESS_TIME_ZONE, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(date);
  return {
    year: Number(parts.find(part => part.type === "year")?.value),
    month: Number(parts.find(part => part.type === "month")?.value),
    day: Number(parts.find(part => part.type === "day")?.value),
  };
}

export function startOfUruguayDay(date = new Date()) {
  const { year, month, day } = partsInBusinessTimeZone(date);
  return new Date(Date.UTC(year, month - 1, day, 3));
}

export function startOfUruguayMonth(date = new Date()) {
  const { year, month } = partsInBusinessTimeZone(date);
  return new Date(Date.UTC(year, month - 1, 1, 3));
}

export function uruguayDashboardDate(date = new Date()) {
  return new Intl.DateTimeFormat("es-UY", { timeZone: BUSINESS_TIME_ZONE, weekday: "long" }).format(date);
}
