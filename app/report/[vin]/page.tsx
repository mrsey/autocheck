import { buildReport } from "@/lib/report";
import { countryName } from "@/lib/vin";
import type { Report } from "@/lib/types";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  registration: "Registration", import: "Import", export: "Export", inspection: "Inspection",
  service: "Service", accident: "Accident", title: "Title", theft_check: "Theft check",
};

function Spec({ k, v }: { k: string; v: string }) {
  return v ? <div className="spec"><span>{k}</span><b>{v}</b></div> : null;
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ vin: string }>;
  searchParams: Promise<{ plate?: string }>;
}) {
  const { vin } = await params;
  const { plate } = await searchParams;
  let r: Report;
  try {
    r = await buildReport(vin, plate);
  } catch (e) {
    return <section className="card"><h2>Could not build report</h2><p className="err">{(e as Error).message}</p><a href="/">Back</a></section>;
  }
  const v = r.vehicle;
  const tone = r.ai.riskScore >= 60 ? "high" : r.ai.riskScore >= 30 ? "mid" : "low";

  return (
    <div className="report">
      <h1>{[v.year, v.make, v.model].filter(Boolean).join(" ") || "Unknown vehicle"}</h1>
      <p className="vin">{v.vin}</p>

      {r.history.source === "demo" ? (
        <div className="banner">{r.history.providerNote}</div>
      ) : (
        !r.history.accidentsCovered && <div className="banner info">{r.history.providerNote}</div>
      )}

      <section className={`card verdict ${tone}`}>
        <div className="score"><b>{r.ai.riskScore}</b><span>/100 risk</span></div>
        <div>
          <h2>{r.ai.verdict} <small>({r.ai.source === "claude" ? "AI analysis by Claude" : "rule-based analysis"})</small></h2>
          <p>{r.ai.summary}</p>
          {r.ai.flags.length > 0 && <ul className="flags">{r.ai.flags.map((f, i) => <li key={i}>{f}</li>)}</ul>}
        </div>
      </section>

      <div className="grid">
        <section className="card">
          <h2>Vehicle specs</h2>
          <Spec k="Trim" v={v.trim} /><Spec k="Body" v={v.bodyClass} /><Spec k="Type" v={v.vehicleType} />
          <Spec k="Engine" v={v.engine} /><Spec k="Fuel" v={v.fuel} /><Spec k="Drive" v={v.driveType} />
          <Spec k="Transmission" v={v.transmission} /><Spec k="Doors" v={v.doors} />
          <Spec k="Built in" v={[v.plantCity, v.plantCountry].filter(Boolean).join(", ")} />
          {r.vinWarnings.map((w, i) => <p key={i} className="err">{w}</p>)}
        </section>

        <section className="card">
          <h2>Countries ({r.countries.length})</h2>
          <div className="chips">{r.countries.map((c) => <span key={c} className="chip">{countryName(c)}</span>)}</div>
          <h2>Accidents ({r.accidents.length})</h2>
          {r.accidents.length === 0 ? <p>{r.history.accidentsCovered ? "No accident records found." : "Not available - this data source has no accident records."}</p> : (
            <ul className="plain">{r.accidents.map((a, i) => (
              <li key={i}><b className={`sev ${a.severity}`}>{a.severity}</b> {a.date} · {countryName(a.country)} — {a.detail}</li>
            ))}</ul>
          )}
          <h2>Odometer</h2>
          {r.odometerIssues.length === 0 ? <p>No rollback detected.</p> : r.odometerIssues.map((o, i) => <p key={i} className="err">{o}</p>)}
        </section>
      </div>

      {r.ai.buyerAdvice.length > 0 && (
        <section className="card" style={{ marginTop: 16 }}>
          <h2>Buyer advice</h2>
          <ul>{r.ai.buyerAdvice.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </section>
      )}

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Timeline</h2>
        <table>
          <thead><tr><th>Date</th><th>Event</th><th>Country</th><th>Odometer</th><th>Detail</th></tr></thead>
          <tbody>
            {r.history.events.map((e, i) => (
              <tr key={i} className={e.type === "accident" ? "row-acc" : ""}>
                <td>{e.date}</td><td>{TYPE_LABEL[e.type] ?? e.type}</td><td>{countryName(e.country)}</td>
                <td>{e.odometerKm != null ? `${e.odometerKm.toLocaleString("en")} km` : "-"}</td><td>{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Safety recalls ({r.recalls.length}) <small>· {r.complaintCount} owner complaints (NHTSA)</small></h2>
        {r.recalls.length === 0 ? <p>No recall campaigns found.</p> : (
          <ul className="plain">{r.recalls.slice(0, 20).map((x) => (
            <li key={x.campaign}><b>{x.component}</b> <small>{x.campaign}</small><br />{x.summary}</li>
          ))}</ul>
        )}
      </section>
    </div>
  );
}
