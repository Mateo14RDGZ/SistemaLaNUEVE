import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
export async function GET() {
  try { if (!(await currentUser())) return new Response("Iniciá sesión", { status: 401 }); const sales = await db.sale.findMany({ include: { items: true, user: { select: { name: true } } }, orderBy: { createdAt: "desc" } }); const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"','""')}"`; const rows=["Fecha,Venta,Estado,Producto,Variante,SKU,Cantidad,Precio unitario,Importe,Medio de pago,Responsable"]; for(const s of sales) for(const i of s.items) rows.push([s.createdAt.toISOString(),s.id,s.status,i.productNameSnapshot,i.variantLabelSnapshot,i.skuSnapshot,i.quantity,i.unitPrice,i.lineTotal,s.paymentMethod,s.user.name].map(esc).join(",")); return new Response(`\uFEFF${rows.join("\r\n")}`,{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":"attachment; filename=la-nueve-ventas.csv","cache-control":"no-store"}}); } catch(e) { const response=apiError(e); return new Response(await response.text(),{status:response.status}); }
}
