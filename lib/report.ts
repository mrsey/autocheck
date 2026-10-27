import { aiAssessment } from "./ai";
import { getHistory } from "./history";
import { decodeVin, getComplaintCount, getRecalls } from "./nhtsa";
import type { Report } from "./types";
import { checkDigitOk, isValidVinFormat, normalizeVin } from "./vin";

export async function buildReport(rawVin: string): Promise<Report> {
  const vin = normalizeVin(rawVin);
  if (!isValidVinFormat(vin)) throw new Error("Invalid VIN: must be 17 characters (letters except I, O, Q, and digits).");

  const vehicle = await decodeVin(vin);
  const vinWarnings: string[] = [];
  if (!vehicle.make) vinWarnings.push("VIN could not be decoded - may be invalid or a non-US-market vehicle");
  if (!checkDigitOk(vin) && /^[1-5]/.test(vin)) vinWarnings.push("VIN check digit invalid (North American VIN)");

  const [recalls, complaintCount, history] = await Promise.all([
    getRecalls(vehicle),
    getComplaintCount(vehicle),
    getHistory(vin, vehicle.plantCountry),
  ]);

  const countries = [...new Set(history.events.map((e) => e.country))];
  const accidents = history.events.filter((e) => e.type === "accident");

  const odometerIssues: string[] = [];
  let last = 0;
  for (const e of history.events) {
    if (e.odometerKm == null) continue;
    if (e.odometerKm + 1000 < last) {
      odometerIssues.push(`Odometer dropped from ${last.toLocaleString("en")} km to ${e.odometerKm.toLocaleString("en")} km on ${e.date}`);
    }
    last = Math.max(last, e.odometerKm);
  }

  const ai = await aiAssessment({
    vehicle,
    recalls,
    complaintCount,
    history,
    countries,
    accidentCount: accidents.length,
    severeCount: accidents.filter((a) => a.severity === "severe").length,
    odometerIssues,
    vinWarnings,
  });

  return {
    vehicle,
    vinWarnings,
    recalls,
    complaintCount,
    history,
    countries,
    accidents,
    odometerIssues,
    ai,
    generatedAt: new Date().toISOString(),
  };
}
