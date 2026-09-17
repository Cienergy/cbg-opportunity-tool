import { useMemo, useState } from "react";
import { useData } from "../lib/DataContext";
import { fmt, scoreDistrict, type ControlParams } from "../lib/types";
import { IndiaMap } from "../components/IndiaMap";

function ParamForm({
  params,
  setParams,
  onReset,
}: {
  params: ControlParams;
  setParams: (p: ControlParams) => void;
  onReset: () => void;
}) {
  const set = (key: keyof ControlParams, value: number) =>
    setParams({ ...params, [key]: value });

  return (
    <div className="controls">
      <div className="field">
        <label>Min net CBG demand (TPD)</label>
        <input type="number" step="0.1" value={params.netCbgDemandTpd} onChange={(e) => set("netCbgDemandTpd", Number(e.target.value))} />
      </div>
      <div className="field">
        <label>Min biomass surplus (KTPA)</label>
        <input type="number" step="1" value={params.netBiomassSurplusKtpa} onChange={(e) => set("netBiomassSurplusKtpa", Number(e.target.value))} />
      </div>
      <div className="field">
        <label>Min est. 5Y demand (TPD)</label>
        <input type="number" step="0.1" value={params.netEstDemand5yTpd} onChange={(e) => set("netEstDemand5yTpd", Number(e.target.value))} />
      </div>
      <div className="field">
        <label>Max distance to pipeline (km)</label>
        <input type="number" step="1" value={params.nearestPipelineKm} onChange={(e) => set("nearestPipelineKm", Number(e.target.value))} />
      </div>
      <div className="btn-row">
        <button className="btn" type="button" onClick={onReset}>Reset to Excel defaults</button>
      </div>
    </div>
  );
}

export function BestLocationsPage() {
  const { data, params, setParams, resetParams, loading, error } = useData();
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  const ranked = useMemo(() => {
    if (!data) return [];
    return data.districts
      .map((d) => ({ d, ...scoreDistrict(d, params) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [data, params]);

  const metricByState = useMemo(() => {
    const m: Record<string, number> = {};
    for (const { d, score } of ranked) {
      if (!d.state) continue;
      m[d.state] = (m[d.state] || 0) + score;
    }
    return m;
  }, [ranked]);

  const stateDistricts = useMemo(() => {
    if (!selectedState) return ranked.slice(0, 40);
    return ranked.filter((x) => x.d.state?.toLowerCase() === selectedState.toLowerCase() ||
      x.d.state?.toLowerCase().includes(selectedState.toLowerCase()) ||
      selectedState.toLowerCase().includes((x.d.state || "").toLowerCase()));
  }, [ranked, selectedState]);

  const active = stateDistricts.find((x) => x.d.district === selectedDistrict)?.d
    || stateDistricts[0]?.d;

  if (loading) return <div className="loading">Loading dataset…</div>;
  if (error || !data) return <div className="error">{error || "No data"}</div>;

  return (
    <div className="page page-wide">
      <div className="hero-line">
        <div>
          <h1>Best locations</h1>
          <p>Rank districts by tweakable demand, biomass, pipeline and 5-year demand thresholds from your Control sheet.</p>
        </div>
        <div className="btn-row">
          <span className="pill">{stateDistricts.length} matches</span>
          {selectedState && (
            <button className="btn" type="button" onClick={() => { setSelectedState(null); setSelectedDistrict(null); }}>
              Clear state
            </button>
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>India map — opportunity intensity</h2>
            <span className="muted">{selectedState || "All states"}</span>
          </div>
          <IndiaMap
            selectedState={selectedState}
            onSelectState={(s) => { setSelectedState(s); setSelectedDistrict(null); }}
            metricByState={metricByState}
            metricLabel="opp. score"
          />
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Parameters</h2></div>
          <div className="panel-body">
            <ParamForm params={params} setParams={setParams} onReset={resetParams} />
          </div>
          {active && (
            <div className="panel-body" style={{ borderTop: "1px solid var(--line)" }}>
              <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)", fontSize: "1.05rem" }}>
                {active.district}, {active.state}
              </h2>
              <div className="detail-grid" style={{ marginTop: "0.75rem" }}>
                <div className="kv"><div className="k">Demand (TPD)</div><div className="v">{fmt(active.currentDemandTpd, 2)}</div></div>
                <div className="kv"><div className="k">Biomass surplus (KTPA)</div><div className="v">{fmt(active.netSurplusKtpa, 1)}</div></div>
                <div className="kv"><div className="k">Pipeline</div><div className="v">{active.pipelineName || "—"}</div></div>
                <div className="kv"><div className="k">Distance (km)</div><div className="v">{fmt(active.pipelineDistanceKm, 1)}</div></div>
                <div className="kv"><div className="k">Plants</div><div className="v">{active.plantCount}</div></div>
                <div className="kv"><div className="k">5Y demand (TPD)</div><div className="v">{fmt(active.futureDemandTpd, 2)}</div></div>
              </div>
              <div className="btn-row" style={{ marginTop: "0.75rem" }}>
                <span className={`pill ${active.flagDemand ? "yes" : "no"}`}>Demand {active.flagDemand ? "Y" : "N"}</span>
                <span className={`pill ${active.flagRawMaterial ? "yes" : "no"}`}>Biomass {active.flagRawMaterial ? "Y" : "N"}</span>
                <span className={`pill ${active.flagNearestPipeline ? "yes" : "no"}`}>Pipeline {active.flagNearestPipeline ? "Y" : "N"}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="panel" style={{ marginTop: "1rem" }}>
        <div className="panel-head">
          <h2>{selectedState ? `Districts in ${selectedState}` : "Top districts"}</h2>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Score</th>
                <th>State</th>
                <th>District</th>
                <th>Demand</th>
                <th>Surplus</th>
                <th>Pipeline km</th>
                <th>Plants</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              {stateDistricts.slice(0, 80).map(({ d, score, reasons }) => (
                <tr
                  key={`${d.state}-${d.district}`}
                  className={active?.district === d.district && active?.state === d.state ? "active" : ""}
                  onClick={() => { setSelectedDistrict(d.district); if (d.state) setSelectedState(d.state); }}
                >
                  <td>{score}</td>
                  <td>{d.state}</td>
                  <td>{d.district}</td>
                  <td>{fmt(d.currentDemandTpd, 2)}</td>
                  <td>{fmt(d.netSurplusKtpa, 1)}</td>
                  <td>{fmt(d.pipelineDistanceKm, 1)}</td>
                  <td>{d.plantCount}</td>
                  <td title={reasons.join(", ")}>{reasons.slice(0, 2).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
