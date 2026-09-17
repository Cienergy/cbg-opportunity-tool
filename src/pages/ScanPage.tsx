import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../lib/DataContext";
import { fmt, rankDistricts } from "../lib/feasibility";

export function ScanPage() {
  const { data, params, loading, error } = useData();
  const [state, setState] = useState("");
  const [minScore, setMinScore] = useState(55);
  const [requirePipeline, setRequirePipeline] = useState(false);
  const [whitespace, setWhitespace] = useState(false);

  const ranked = useMemo(() => {
    if (!data) return [];
    let rows = rankDistricts(data.districts, params, data.plants);
    if (state) rows = rows.filter((r) => r.d.state === state);
    if (requirePipeline) rows = rows.filter((r) => r.d.flagNearestPipeline);
    if (whitespace) rows = rows.filter((r) => r.d.plantCount === 0);
    return rows.filter((r) => r.feasibility.score >= minScore);
  }, [data, params, state, minScore, requirePipeline, whitespace]);

  if (loading) return <div className="loading">Scanning districts…</div>;
  if (error || !data) return <div className="error">{error || "No data"}</div>;

  const states = [...new Set(data.districts.map((d) => d.state).filter(Boolean))].sort() as string[];

  return (
    <div className="page">
      <div className="scan-hero" style={{ marginBottom: "1rem" }}>
        <div>
          <h1>Scan</h1>
          <p>Ranked shortlist — open a row for the full dossier.</p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <div className="panel-body scan-filters">
          <div className="field">
            <label>State</label>
            <select value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">All India</option>
              {states.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Min score</label>
            <input type="number" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} />
          </div>
          <label style={{ display: "flex", alignItems: "end", gap: "0.45rem", paddingBottom: "0.55rem" }}>
            <input type="checkbox" checked={requirePipeline} onChange={(e) => setRequirePipeline(e.target.checked)} />
            Pipeline flag Y
          </label>
          <label style={{ display: "flex", alignItems: "end", gap: "0.45rem", paddingBottom: "0.55rem" }}>
            <input type="checkbox" checked={whitespace} onChange={(e) => setWhitespace(e.target.checked)} />
            No existing plants
          </label>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>{ranked.length} districts</h2>
        </div>
        <div className="table-wrap" style={{ maxHeight: "70vh" }}>
          <table className="data">
            <thead>
              <tr>
                <th>#</th>
                <th>District</th>
                <th>State</th>
                <th>Score</th>
                <th>Verdict</th>
                <th>Demand</th>
                <th>Biomass</th>
                <th>Pipeline</th>
                <th>Competition</th>
                <th>Demand TPD</th>
                <th>Surplus KTPA</th>
                <th>Plants</th>
              </tr>
            </thead>
            <tbody>
              {ranked.slice(0, 200).map(({ d, feasibility }, i) => {
                const pillar = Object.fromEntries(feasibility.pillars.map((p) => [p.id, p.level]));
                return (
                  <tr key={`${d.state}-${d.district}`}>
                    <td>{i + 1}</td>
                    <td>
                      <Link
                        to={`/?state=${encodeURIComponent(d.state || "")}&district=${encodeURIComponent(d.district || "")}`}
                        style={{ fontWeight: 600, color: "var(--accent)" }}
                      >
                        {d.district}
                      </Link>
                    </td>
                    <td>{d.state}</td>
                    <td>{feasibility.score}</td>
                    <td>{feasibility.verdict}</td>
                    <td><span className={`level ${pillar.demand}`}>{pillar.demand}</span></td>
                    <td><span className={`level ${pillar.biomass}`}>{pillar.biomass}</span></td>
                    <td><span className={`level ${pillar.pipeline}`}>{pillar.pipeline}</span></td>
                    <td><span className={`level ${pillar.competition}`}>{pillar.competition}</span></td>
                    <td>{fmt(d.currentDemandTpd, 1)}</td>
                    <td>{fmt(d.netSurplusKtpa, 0)}</td>
                    <td>{d.plantCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
