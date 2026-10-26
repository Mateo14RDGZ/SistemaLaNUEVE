import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
export async function GET(){try{await requireUser();return NextResponse.json(await db.productionBatch.findMany({include:{recipe:true,consumptions:{include:{ingredient:true}}},orderBy:{createdAt:"desc"}}))}catch(e){return apiError(e)}}
export async function POST(request:Request){try{const user=await requireUser();const parsed=z.object({code:z.string().trim().min(1).max(40),plannedVolumeMl:z.number().int().positive(),recipeName:z.string().trim().max(100).optional(),notes:z.string().max(1000).optional()}).safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Revisá código y volumen del lote."},{status:400});const d=parsed.data;const batch=await db.$transaction(async tx=>{let recipe=null;if(d.recipeName)recipe=await tx.recipe.create({data:{name:d.recipeName,plannedVolumeMl:d.plannedVolumeMl}});const b=await tx.productionBatch.create({data:{code:d.code,plannedVolumeMl:d.plannedVolumeMl,recipeId:recipe?.id,notes:d.notes}});await tx.auditLog.create({data:{userId:user.id,action:"CREATE",entityType:"ProductionBatch",entityId:b.id}});return b});return NextResponse.json(batch,{status:201})}catch(e){return apiError(e)}}
