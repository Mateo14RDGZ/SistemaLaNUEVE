import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
export async function GET(){try{await requireUser();return NextResponse.json(await db.inventoryMovement.findMany({include:{user:{select:{name:true}},variant:{include:{product:true}},ingredient:true},orderBy:{createdAt:"desc"},take:200}))}catch(e){return apiError(e)}}
