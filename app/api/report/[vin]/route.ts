import { NextResponse } from "next/server";
import { buildReport } from "@/lib/report";

export const maxDuration = 30;

export async function GET(req: Request, ctx: { params: Promise<{ vin: string }> }) {
  const { vin } = await ctx.params;
  const plate = new URL(req.url).searchParams.get("plate") ?? undefined;
  try {
    return NextResponse.json(await buildReport(vin, plate));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
