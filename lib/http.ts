import { NextResponse } from "next/server";
export function apiError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Iniciá sesión para continuar." }, { status: 401 });
  if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "No tenés permiso para esta operación." }, { status: 403 });
  if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return NextResponse.json({ error: "El valor ya está en uso." }, { status: 409 });
  console.error("API error", error);
  return NextResponse.json({ error: "No se pudo completar la operación." }, { status: 500 });
}
