import type { HistoryEvent } from "./types";

/**
 * UK DVSA MOT History API (free, government). Register at
 * https://documentation.history.mot.api.gov.uk/mot-history-api/register
 * You receive: tenant ID, client ID, client secret, API key.
 *
 * NOTE: the lookup path and field names below follow DVSA's published trade API as
 * documented by third parties; confirm against the official spec once you have a key.
 * The base URL is overridable via MOT_API_BASE.
 */
const BASE = process.env.MOT_API_BASE || "https://history.mot.api.gov.uk/v1/trade/vehicles";

let cachedToken: { value: string; exp: number } | null = null;

export function motConfigured(): boolean {
  return !!(process.env.MOT_TENANT_ID && process.env.MOT_CLIENT_ID && process.env.MOT_CLIENT_SECRET && process.env.MOT_API_KEY);
}

async function token(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.value;
  const res = await fetch(`https://login.microsoftonline.com/${process.env.MOT_TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.MOT_CLIENT_ID!,
      client_secret: process.env.MOT_CLIENT_SECRET!,
      scope: "https://tapi.dvsa.gov.uk/.default",
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`MOT token ${res.status}`);
  const j = await res.json();
  cachedToken = { value: j.access_token, exp: Date.now() + (j.expires_in ?? 3000) * 1000 };
  return cachedToken.value;
}

const isoDate = (s?: string) => (s ? s.replace(/\./g, "-").slice(0, 10) : "");

export async function getMotEvents(plate: string): Promise<HistoryEvent[]> {
  const reg = plate.replace(/\s+/g, "").toUpperCase();
  const res = await fetch(`${BASE}/registration/${encodeURIComponent(reg)}`, {
    headers: { Authorization: `Bearer ${await token()}`, "X-API-Key": process.env.MOT_API_KEY!, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`MOT lookup ${res.status}`);
  const v = await res.json();
  const events: HistoryEvent[] = [];
  const first = isoDate(v.firstUsedDate || v.registrationDate);
  if (first) events.push({ date: first, type: "registration", country: "GB", detail: `First used (${[v.make, v.model].filter(Boolean).join(" ")})`, odometerKm: 0 });
  for (const t of v.motTests ?? []) {
    const val = Number(t.odometerValue);
    const km = Number.isFinite(val) && t.odometerResultType !== "NO_ODOMETER"
      ? Math.round(String(t.odometerUnit).toUpperCase().startsWith("MI") ? val * 1.60934 : val)
      : undefined;
    const defects = (t.defects ?? []) as { text?: string; type?: string }[];
    const dangerous = defects.filter((d) => /DANGEROUS|MAJOR|FAIL/i.test(d.type ?? "")).length;
    const passed = t.testResult ? /PASS/i.test(t.testResult) : t.passed;
    events.push({
      date: isoDate(t.completedDate),
      type: "inspection",
      country: "GB",
      detail: `MOT ${passed ? "passed" : "failed"}${defects.length ? ` - ${defects.length} defect/advisory item(s)${dangerous ? `, ${dangerous} major/dangerous` : ""}` : ""}`,
      odometerKm: km,
    });
  }
  return events.filter((e) => e.date).sort((a, b) => a.date.localeCompare(b.date));
}
