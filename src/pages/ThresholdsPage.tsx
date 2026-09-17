import { useData } from "../lib/DataContext";
import type { ControlParams } from "../lib/types";

export function ThresholdsPage() {
  const { data, params, setParams, resetParams, loading, error } = useData();

  if (loading) return <div className="loading">Loading…</div>;
  if (error || !data) return <div className="error">{error || "No data"}</div>;

  const set = (key: keyof ControlParams, value: number) => setParams({ ...params, [key]: value });

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="scan-hero" style={{ marginBottom: "1rem" }}>
        <h1>Thresholds</h1>
        <p>
          These are the knobs an investor / BD lead tweaks before judging a district.
          Defaults come from the Excel Control sheet.
        </p>
      </div>

      <div className="panel">
        <div className="panel-body controls" style={{ display: "grid", gap: "0.85rem" }}>
          <div className="field">
            <label>Minimum current CBG demand (TPD)</label>
            <input type="number" step="0.1" value={params.netCbgDemandTpd} onChange={(e) => set("netCbgDemandTpd", Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Minimum biomass surplus (KTPA)</label>
            <input type="number" step="1" value={params.netBiomassSurplusKtpa} onChange={(e) => set("netBiomassSurplusKtpa", Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Minimum estimated 5Y demand (TPD)</label>
            <input type="number" step="0.1" value={params.netEstDemand5yTpd} onChange={(e) => set("netEstDemand5yTpd", Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Maximum useful pipeline distance (km)</label>
            <input type="number" step="1" value={params.nearestPipelineKm} onChange={(e) => set("nearestPipelineKm", Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Nearby GAs in offtake catchment (count)</label>
            <input type="number" step="1" min={0} max={20} value={params.nearbyGaLimit ?? 8} onChange={(e) => set("nearbyGaLimit", Number(e.target.value))} />
          </div>
          <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>
            Addressable demand = home GA(s) covering this district + GAs covering peer districts in the same state (policy: supply to nearby GAs).
          </p>
          <div className="btn-row">
            <button className="btn primary" type="button" onClick={resetParams}>Reset to Excel defaults</button>
          </div>
        </div>
      </div>
    </div>
  );
}
