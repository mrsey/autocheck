export type EventType =
  | "registration"
  | "import"
  | "export"
  | "inspection"
  | "service"
  | "accident"
  | "title"
  | "theft_check";

export interface HistoryEvent {
  date: string; // ISO yyyy-mm-dd
  type: EventType;
  country: string; // ISO 3166-1 alpha-2
  detail: string;
  odometerKm?: number;
  severity?: "minor" | "moderate" | "severe";
}

export interface Vehicle {
  vin: string;
  make: string;
  model: string;
  year: string;
  trim: string;
  bodyClass: string;
  driveType: string;
  engine: string;
  fuel: string;
  transmission: string;
  plantCountry: string;
  plantCity: string;
  doors: string;
  vehicleType: string;
}

export interface Recall {
  campaign: string;
  component: string;
  summary: string;
  remedy: string;
  date: string;
}

export interface History {
  source: "live" | "demo";
  providerNote: string;
  events: HistoryEvent[];
}

export interface AiAssessment {
  source: "claude" | "rules";
  riskScore: number; // 0 (great) - 100 (avoid)
  verdict: "Low risk" | "Moderate risk" | "High risk";
  summary: string;
  flags: string[];
  buyerAdvice: string[];
}

export interface Report {
  vehicle: Vehicle;
  vinWarnings: string[];
  recalls: Recall[];
  complaintCount: number;
  history: History;
  countries: string[];
  accidents: HistoryEvent[];
  odometerIssues: string[];
  ai: AiAssessment;
  generatedAt: string;
}
