"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const SAMPLES = ["1HGCM82633A004352", "5YJSA1E26HF000337", "WBA3A5C51CF256651"];

export default function Home() {
  const router = useRouter();
  const [vin, setVin] = useState("");
  const [plate, setPlate] = useState("");
  const [err, setErr] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = vin.trim().toUpperCase();
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) {
      setErr("Enter a valid 17-character VIN (no I, O or Q).");
      return;
    }
    const p = plate.replace(/\s+/g, "").toUpperCase();
    router.push(`/report/${v}${p ? `?plate=${encodeURIComponent(p)}` : ""}`);
  }

  return (
    <section className="hero">
      <h1>Know the car before you buy it.</h1>
      <p>Enter a VIN for specs, recalls, accident records, every country the car has been registered in, odometer checks and an AI risk verdict.</p>
      <form onSubmit={submit} className="search">
        <input
          value={vin}
          onChange={(e) => { setVin(e.target.value); setErr(""); }}
          placeholder="17-character VIN"
          maxLength={17}
          autoFocus
          aria-label="VIN"
        />
        <button type="submit">Check vehicle</button>
      </form>
      <input
        className="plate"
        value={plate}
        onChange={(e) => setPlate(e.target.value)}
        placeholder="UK number plate (optional) - adds real MOT mileage history"
        maxLength={10}
        aria-label="UK number plate"
      />
      {err && <p className="err">{err}</p>}
      <p className="samples">
        Try:{" "}
        {SAMPLES.map((s) => (
          <button key={s} type="button" className="link" onClick={() => router.push(`/report/${s}`)}>{s}</button>
        ))}
      </p>
    </section>
  );
}
