import { useMemo, useState } from "react";
import { useData } from "../lib/DataContext";
import { fmt, matchesState } from "../lib/types";
import { IndiaMap } from "../components/IndiaMap";

export function StatesPage() {
  const { data, loading, error } = useData();
  const [selectedState, setSelectedState] = useState<string | null>("Uttar Pradesh");
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  const metricByState = useMemo(() => {
    const m: Record<string, number> = {};
    if (!data) return m;
    for (const s of data.summaryStates) {
      if (s.state) m[s.state] = s.demandTpd;
    }
    return m;
  }, [data]);

  const districts = useMemo(() => {
    if (!data || !selectedState) return [];
    return data.districts
      .filter((d) => matchesState(d.state, selectedState))
      .sort((a, b) => b.currentDemandTpd - a.currentDemandTpd);
  }, [data, selectedState]);

  const active = districts.find((d) => d.district === selectedDistrict) || districts[0];
  const nearby = districts.filter((d) => d.district !== active?.district).slice(0, 12);

  if (loading) return <div className="loading">Loading dataset…</div>;
  if (error || !data) return <div className="error">{error || "No data"}</div>;

  return (
    <div className="page page-wide">
      <div className="hero-line">
        <div>
          <h1>States & districts</h1>
          <p>Select a state on the map to highlight it, browse its districts, and inspect demand, biomass surplus and pipeline presence.</p>
        </div>
        <div className="field" style={{ minWidth: 220 }}>
          <label>State</label>
          <select
            value={selectedState || ""}
            onChange={(e) => { setSelectedState(e.target.value || null); setSelectedDistrict(null); }}
          >
            {[...new Set(data.districts.map((d) => d.state).filter(Boolean))].sort().map((s) => (
              <option key={s!} value={s!}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head"><h2>Map</h2><span className="muted">shaded by current CBG demand</span></div>
          <IndiaMap
            selectedState={selectedState}
            onSelectState={(s) => { setSelectedState(s); setSelectedDistrict(null); }}
            metricByState={metricByState}
            metricLabel="demand TPD"
          />
        </div>

        <div className="panel">
          <div className="panel-head"><h2>{active ? `${active.district}` : "District detail"}</h2></div>
          <div className="panel-body">
            {active ? (
              <>
                <p className="muted" style={{ marginTop: 0 }}>{active.state}</p>
                <div className="detail-grid">
                  <div className="kv"><div className="k">Current demand (TPD)</div><div className="v">{fmt(active.currentDemandTpd, 2)}</div></div>
                  <div className="kv"><div className="k">5Y demand (TPD)</div><div className="v">{fmt(active.futureDemandTpd, 2)}</div></div>
                  <div className="kv"><div className="k">Net biomass surplus (KTPA)</div><div className="v">{fmt(active.netSurplusKtpa, 1)}</div></div>
                  <div className="kv"><div className="k">Gross surplus (KTPA)</div><div className="v">{fmt(active.grossSurplusKtpa, 1)}</div></div>
                  <div className="kv"><div className="k">Pipeline exists</div><div className="v">{active.flagNearestPipeline ? "Yes" : "No / far"}</div></div>
                  <div className="kv"><div className="k">Pipeline distance (km)</div><div className="v">{fmt(active.pipelineDistanceKm, 1)}</div></div>
                  <div className="kv"><div className="k">Pipeline name</div><div className="v">{active.pipelineName || "—"}</div></div>
                  <div className="kv"><div className="k">CBG plants</div><div className="v">{active.plantCount} ({active.functionalCompleted} live)</div></div>
                </div>
                <div className="btn-row" style={{ marginTop: "0.85rem" }}>
                  <span className={`pill ${active.flagDemand ? "yes" : "no"}`}>Demand flag</span>
                  <span className={`pill ${active.flagRawMaterial ? "yes" : "no"}`}>Biomass flag</span>
                  <span className={`pill ${active.flagNearestPipeline ? "yes" : "no"}`}>Pipeline flag</span>
                </div>
                {active.plants.length > 0 && (
                  <div style={{ marginTop: "1rem" }}>
                    <div className="muted" style={{ marginBottom: "0.35rem" }}>Named plants</div>
                    <div className="list">
                      {active.plants.map((p) => <div className="card-row" key={p}><h3>{p}</h3></div>)}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="muted">Select a state with district data.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: "1rem" }}>
        <div className="panel">
          <div className="panel-head"><h2>Districts in state</h2><span className="muted">{districts.length}</span></div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>District</th>
                  <th>Demand</th>
                  <th>Surplus</th>
                  <th>Pipe km</th>
                  <th>Plants</th>
                </tr>
              </thead>
              <tbody>
                {districts.map((d) => (
                  <tr
                    key={d.district!}
                    className={active?.district === d.district ? "active" : ""}
                    onClick={() => setSelectedDistrict(d.district)}
                  >
                    <td>{d.district}</td>
                    <td>{fmt(d.currentDemandTpd, 2)}</td>
                    <td>{fmt(d.netSurplusKtpa, 1)}</td>
                    <td>{fmt(d.pipelineDistanceKm, 1)}</td>
                    <td>{d.plantCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h2>Nearby districts (same state)</h2></div>
          <div className="panel-body list">
            {nearby.map((d) => (
              <button
                key={d.district!}
                type="button"
                className="card-row"
                style={{ textAlign: "left", cursor: "pointer", width: "100%" }}
                onClick={() => setSelectedDistrict(d.district)}
              >
                <h3>{d.district}</h3>
                <p>
                  Demand {fmt(d.currentDemandTpd, 2)} TPD · Surplus {fmt(d.netSurplusKtpa, 1)} KTPA · Pipeline{" "}
                  {d.flagNearestPipeline ? "Y" : "N"}
                </p>
              </button>
            ))}
            {nearby.length === 0 && <p className="muted">No other districts.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
