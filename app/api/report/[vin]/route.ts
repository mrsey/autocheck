import { NextResponse } from "next/server";
import { buildReport } from "@/lib/report";

export const maxDuration = 30;

export async function GET(_req: Request, ctx: { params: Promise<{ vin: string }> }) {
  const { vin } = await ctx.params;
  try {
    return NextResponse.json(await buildReport(vin));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
