import type { Recall, Vehicle } from "./types";

const VPIC = "https://vpic.nhtsa.dot.gov/api/vehicles";

async function getJson(url: string) {
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`Upstream ${res.status} for ${url}`);
  return res.json();
}

export async function decodeVin(vin: string): Promise<Vehicle> {
  const data = await getJson(`${VPIC}/DecodeVinValues/${vin}?format=json`);
  const r = data.Results?.[0] ?? {};
  const s = (k: string) => (r[k] && String(r[k]).trim()) || "";
  const engine = [
    s("DisplacementL") && `${Number(s("DisplacementL")).toFixed(1)}L`,
    s("EngineCylinders") && `${s("EngineCylinders")}-cyl`,
    s("EngineHP") && `${s("EngineHP")} hp`,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    vin,
    make: s("Make"),
    model: s("Model"),
    year: s("ModelYear"),
    trim: [s("Trim"), s("Series")].filter(Boolean).join(" "),
    bodyClass: s("BodyClass"),
    driveType: s("DriveType"),
    engine,
    fuel: s("FuelTypePrimary"),
    transmission: s("TransmissionStyle"),
    plantCountry: s("PlantCountry"),
    plantCity: s("PlantCity"),
    doors: s("Doors"),
    vehicleType: s("VehicleType"),
  };
}

export async function getRecalls(v: Vehicle): Promise<Recall[]> {
  if (!v.make || !v.model || !v.year) return [];
  try {
    const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(v.make)}&model=${encodeURIComponent(v.model)}&modelYear=${v.year}`;
    const data = await getJson(url);
    return (data.results ?? []).map((x: Record<string, string>) => ({
      campaign: x.NHTSACampaignNumber,
      component: x.Component,
      summary: x.Summary,
      remedy: x.Remedy,
      date: x.ReportReceivedDate,
    }));
  } catch {
    return [];
  }
}

export async function getComplaintCount(v: Vehicle): Promise<number> {
  if (!v.make || !v.model || !v.year) return 0;
  try {
    const url = `https://api.nhtsa.gov/complaints/complaintsByVehicle?make=${encodeURIComponent(v.make)}&model=${encodeURIComponent(v.model)}&modelYear=${v.year}`;
    const data = await getJson(url);
    return data.count ?? data.results?.length ?? 0;
  } catch {
    return 0;
  }
}
