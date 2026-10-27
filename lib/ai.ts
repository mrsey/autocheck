import type { AiAssessment, History, Recall, Vehicle } from "./types";

interface Facts {
  vehicle: Vehicle;
  recalls: Recall[];
  complaintCount: number;
  history: History;
  countries: string[];
  accidentCount: number;
  severeCount: number;
  odometerIssues: string[];
  vinWarnings: string[];
}

export function rulesAssessment(f: Facts): AiAssessment {
  let score = 5;
  const flags: string[] = [];
  const advice: string[] = [];
  const minor = f.accidentCount - f.severeCount;
  score += f.severeCount * 25 + minor * 8;
  if (f.severeCount) flags.push(`${f.severeCount} severe accident record(s)`);
  if (minor > 0) flags.push(`${minor} lesser accident record(s)`);
  if (f.odometerIssues.length) { score += 30; flags.push("Odometer inconsistency detected"); }
  if (f.recalls.length) { score += Math.min(15, f.recalls.length * 3); flags.push(`${f.recalls.length} open-or-past safety recall campaign(s)`); }
  if (f.countries.length > 3) { score += 8; flags.push(`Registered in ${f.countries.length} countries`); }
  if (f.vinWarnings.length) { score += 10; flags.push(...f.vinWarnings); }
  score = Math.min(100, score);
  advice.push("Get an independent pre-purchase inspection, including a frame/structure check.");
  if (f.recalls.length) advice.push("Confirm all recall remedies were completed at a dealer.");
  if (f.accidentCount) advice.push("Ask for repair invoices for every accident record.");
  if (f.countries.length > 1) advice.push("Verify import paperwork and request a history report from each former country.");
  const verdict = score >= 60 ? "High risk" : score >= 30 ? "Moderate risk" : "Low risk";
  const v = f.vehicle;
  return {
    source: "rules",
    riskScore: score,
    verdict,
    flags,
    buyerAdvice: advice,
    summary: `${v.year} ${v.make} ${v.model}: ${f.accidentCount} accident record(s), ${f.countries.length} countr${f.countries.length === 1 ? "y" : "ies"} in history, ${f.recalls.length} recall campaign(s). Rule-based assessment (no AI key configured).`,
  };
}

export async function aiAssessment(f: Facts): Promise<AiAssessment> {
  const fallback = rulesAssessment(f);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return fallback;

  const payload = {
    vehicle: f.vehicle,
    historySource: f.history.source,
    accidentRecordsCovered: f.history.accidentsCovered,
    events: f.history.events,
    countries: f.countries,
    recallCount: f.recalls.length,
    recallComponents: f.recalls.slice(0, 15).map((r) => `${r.component}: ${r.summary.slice(0, 160)}`),
    complaintCount: f.complaintCount,
    odometerIssues: f.odometerIssues,
    vinWarnings: f.vinWarnings,
  };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
        max_tokens: 900,
        system:
          "You are a used-car inspection analyst. Given structured vehicle history data, assess buyer risk. " +
          "Only use the provided data; never invent records. If historySource is 'demo', say the data is sample data. If accidentRecordsCovered is false, never imply the car is accident-free. " +
          'Reply with ONLY JSON: {"riskScore":0-100,"summary":"2-4 sentences","flags":["..."],"buyerAdvice":["..."]}',
        messages: [{ role: "user", content: JSON.stringify(payload) }],
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    const text: string = data.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    const score = Math.max(0, Math.min(100, Number(json.riskScore)));
    if (Number.isNaN(score)) return fallback;
    return {
      source: "claude",
      riskScore: score,
      verdict: score >= 60 ? "High risk" : score >= 30 ? "Moderate risk" : "Low risk",
      summary: String(json.summary ?? fallback.summary),
      flags: Array.isArray(json.flags) ? json.flags.map(String) : fallback.flags,
      buyerAdvice: Array.isArray(json.buyerAdvice) ? json.buyerAdvice.map(String) : fallback.buyerAdvice,
    };
  } catch {
    return fallback;
  }
}
