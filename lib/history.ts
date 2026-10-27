import { getMotEvents, motConfigured } from "./mot";
import type { EventType, History, HistoryEvent } from "./types";

/**
 * Vehicle history provider.
 *
 * No free public source exists for worldwide accident / cross-border history.
 * Real data comes from paid providers (Carfax, AutoCheck, VinAudit, AutoDNA, ...)
 * and national registries. Set HISTORY_API_URL (+ HISTORY_API_KEY) to plug one in;
 * the adapter below expects { events: HistoryEvent[] }. Map other shapes in `normalize`.
 *
 * Without credentials the app runs in DEMO mode with deterministic, clearly
 * labelled SAMPLE data so the UI and AI analysis can be evaluated.
 */
export async function getHistory(vin: string, plantCountryHint: string, plate?: string): Promise<History> {
  // Free real source: UK MOT history (mileage + test results, no accident data).
  if (plate && motConfigured()) {
    try {
      const events = await getMotEvents(plate);
      if (events.length) {
        return {
          source: "live",
          accidentsCovered: false,
          providerNote: "UK MOT history (DVSA). Mileage and test results are real; accident records are not covered by this source.",
          events,
        };
      }
    } catch {
      /* fall through */
    }
  }
  const url = process.env.HISTORY_API_URL;
  if (url) {
    try {
      const res = await fetch(url.replace("{vin}", encodeURIComponent(vin)), {
        headers: process.env.HISTORY_API_KEY
          ? { Authorization: `Bearer ${process.env.HISTORY_API_KEY}` }
          : {},
        cache: "no-store",
      });
      if (res.ok) {
        const events = normalize(await res.json());
        return { source: "live", accidentsCovered: true, providerNote: "Data from configured history provider.", events };
      }
    } catch {
      /* fall through to demo */
    }
  }
  return {
    source: "demo",
    accidentsCovered: true,
    providerNote:
      "DEMO MODE: history, accident and country data below is generated SAMPLE data, not real records. Configure HISTORY_API_URL to use a real provider.",
    events: demoEvents(vin, plantCountryHint),
  };
}

function normalize(json: unknown): HistoryEvent[] {
  const raw = (json as { events?: HistoryEvent[] })?.events ?? [];
  return raw
    .filter((e) => e && e.date && e.type && e.country)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ---- demo generator -------------------------------------------------------

function rng(seedStr: string) {
  let h = 2166136261;
  for (const c of seedStr) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COUNTRIES = ["US", "CA", "DE", "GB", "FR", "JP", "KR", "AE", "TH", "KH", "AU", "NL", "IT", "ES", "SG", "CN"];
const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];

function demoEvents(vin: string, plantCountry: string): HistoryEvent[] {
  const r = rng(vin);
  const yearCode = vin[9];
  const yearMap = "ABCDEFGHJKLMNPRSTVWXY123456789";
  const idx = yearMap.indexOf(yearCode);
  const modelYear = idx >= 0 ? 2010 + idx : 2018;
  const startYear = Math.min(modelYear > 2039 ? 2010 : modelYear, 2026);
  const events: HistoryEvent[] = [];
  let odo = 0;
  let country = pick(r, COUNTRIES);
  let year = startYear;
  let month = 1 + Math.floor(r() * 12);
  const date = () => `${year}-${String(month).padStart(2, "0")}-${String(1 + Math.floor(r() * 27)).padStart(2, "0")}`;
  const push = (type: EventType, detail: string, extra: Partial<HistoryEvent> = {}) =>
    events.push({ date: date(), type, country, detail, odometerKm: Math.round(odo), ...extra });
  const advance = () => {
    month += 2 + Math.floor(r() * 8);
    while (month > 12) { month -= 12; year++; }
    odo += 4000 + r() * 14000;
  };

  push("registration", "First registration", { odometerKm: 0 });
  const steps = 6 + Math.floor(r() * 7);
  for (let i = 0; i < steps && year <= 2026; i++) {
    advance();
    const roll = r();
    if (roll < 0.22) {
      const next = pick(r, COUNTRIES.filter((c) => c !== country));
      push("export", `Exported to ${next}`);
      country = next;
      push("import", "Imported and re-registered");
    } else if (roll < 0.42) {
      const sev = pick(r, ["minor", "minor", "moderate", "severe"] as const);
      push("accident", `${sev === "severe" ? "Structural damage, airbag deployed" : sev === "moderate" ? "Collision, panel and bumper damage" : "Minor parking / low-speed impact"}`, { severity: sev });
    } else if (roll < 0.7) {
      push("inspection", r() > 0.15 ? "Periodic technical inspection passed" : "Inspection failed - brakes / emissions");
    } else if (roll < 0.9) {
      push("service", "Scheduled service");
    } else {
      push("theft_check", "Checked against stolen-vehicle registries: clear");
    }
    // occasional odometer rollback anomaly
    if (r() < 0.06 && events.length > 2) odo = Math.max(0, odo - 30000);
  }
  void plantCountry;
  return events;
}
