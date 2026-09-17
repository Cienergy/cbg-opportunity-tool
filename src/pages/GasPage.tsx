import { useMemo, useState } from "react";
import { useData } from "../lib/DataContext";
import { fmt, matchesState, scoreGa } from "../lib/types";
import { IndiaMap } from "../components/IndiaMap";

export function GasPage() {
  const { data, params, loading, error } = useData();
  const [selectedState, setSelectedState] = useState<string | null>("Gujarat");
  const [selectedGa, setSelectedGa] = useState<string | null>(null);

  const ranked = useMemo(() => {
    if (!data) return [];
    return data.gas
      .map((g) => ({ g, ...scoreGa(g, params) }))
      .sort((a, b) => b.score - a.score);
  }, [data, params]);

  const metricByState = useMemo(() => {
    const m: Record<string, number> = {};
    for (const { g, score } of ranked) {
      if (!g.state) continue;
      m[g.state] = Math.max(m[g.state] || 0, score);
    }
    return m;
  }, [ranked]);

  const gasList = useMemo(() => {
    if (!selectedState) return ranked.slice(0, 50);
    return ranked.filter((x) => matchesState(x.g.state, selectedState));
  }, [ranked, selectedState]);

  const active = gasList.find((x) => x.g.gaId === selectedGa)?.g || gasList[0]?.g;

  if (loading) return <div className="loading">Loading dataset…</div>;
  if (error || !data) return <div className="error">{error || "No data"}</div>;

  return (
    <div className="page page-wide">
      <div className="hero-line">
        <div>
          <h1>Geographical Areas (GAs)</h1>
          <p>Same lens as districts: pick a state, highlight it, then inspect GA demand, biomass surplus and pipeline linkage.</p>
        </div>
        <div className="field" style={{ minWidth: 220 }}>
          <label>State</label>
          <select
            value={selectedState || ""}
            onChange={(e) => { setSelectedState(e.target.value || null); setSelectedGa(null); }}
          >
            {[...new Set(data.gas.map((g) => g.state).filter(Boolean))].sort().map((s) => (
              <option key={s!} value={s!}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head"><h2>Map</h2><span className="muted">best GA score by state</span></div>
          <IndiaMap
            selectedState={selectedState}
            onSelectState={(s) => { setSelectedState(s); setSelectedGa(null); }}
            metricByState={metricByState}
            metricLabel="best GA score"
          />
        </div>
        <div className="panel">
          <div className="panel-head"><h2>{active ? `${active.area}` : "GA detail"}</h2></div>
          <div className="panel-body">
            {active ? (
              <>
                <p className="muted" style={{ marginTop: 0 }}>
                  GA {active.gaId} · {active.entity} · {active.state}
                </p>
                <div className="detail-grid">
                  <div className="kv"><div className="k">Current demand (TPD)</div><div className="v">{fmt(active.currentDemandTpd, 2)}</div></div>
                  <div className="kv"><div className="k">5Y demand (TPD)</div><div className="v">{fmt(active.futureDemandTpd, 2)}</div></div>
                  <div className="kv"><div className="k">Biomass surplus (KTPA)</div><div className="v">{fmt(active.netSurplusKtpa, 1)}</div></div>
                  <div className="kv"><div className="k">Pipeline</div><div className="v">{active.flagNearestPipeline ? "Yes" : "No"}</div></div>
                  <div className="kv"><div className="k">Pipeline name</div><div className="v">{active.pipelineName || "—"}</div></div>
                  <div className="kv"><div className="k">Pipe distance / length</div><div className="v">{fmt(active.pipelineDistanceKm, 1)}</div></div>
                  <div className="kv"><div className="k">CBG plants</div><div className="v">{active.plantCount}</div></div>
                  <div className="kv"><div className="k">CNG stations</div><div className="v">{fmt(active.cngStations, 0)}</div></div>
                </div>
              </>
            ) : (
              <p className="muted">No GAs for this state.</p>
            )}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: "1rem" }}>
        <div className="panel-head"><h2>GA list</h2><span className="muted">{gasList.length}</span></div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Score</th>
                <th>GA ID</th>
                <th>Area</th>
                <th>Entity</th>
                <th>Demand</th>
                <th>Surplus</th>
                <th>Pipeline</th>
                <th>Plants</th>
              </tr>
            </thead>
            <tbody>
              {gasList.map(({ g, score }) => (
                <tr
                  key={`${g.gaId}-${g.area}`}
                  className={active?.gaId === g.gaId && active?.area === g.area ? "active" : ""}
                  onClick={() => setSelectedGa(g.gaId)}
                >
                  <td>{score}</td>
                  <td>{g.gaId}</td>
                  <td>{g.area}</td>
                  <td>{g.entity}</td>
                  <td>{fmt(g.currentDemandTpd, 2)}</td>
                  <td>{fmt(g.netSurplusKtpa, 1)}</td>
                  <td>{g.flagNearestPipeline ? "Y" : "N"}</td>
                  <td>{g.plantCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
