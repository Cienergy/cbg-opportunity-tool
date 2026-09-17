import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IndiaMap } from "../components/IndiaMap";
import { useData } from "../lib/DataContext";
import {
  assessDistrict,
  fmt,
  plantsInDistrict,
  rankDistricts,
  type Pillar,
} from "../lib/feasibility";
import { matchesState, type District } from "../lib/types";

export function DistrictPage() {
  const { data, params, loading, error } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [activePillar, setActivePillar] = useState<Pillar["id"]>("demand");

  const states = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.districts.map((d) => d.state).filter(Boolean))].sort() as string[];
  }, [data]);

  const selected = useMemo(() => {
    if (!data) return null;
    const state = searchParams.get("state");
    const district = searchParams.get("district");
    if (state && district) {
      return (
        data.districts.find(
          (d) => matchesState(d.state, state) && d.district?.toLowerCase() === district.toLowerCase()
        ) || null
      );
    }
    // default: best scoring district
    return rankDistricts(data.districts, params, data.plants)[0]?.d || data.districts[0] || null;
  }, [data, params, searchParams]);

  useEffect(() => {
    if (!data || searchParams.get("district") || !selected) return;
    setSearchParams(
      { state: selected.state || "", district: selected.district || "" },
      { replace: true }
    );
  }, [data, selected, searchParams, setSearchParams]);

  const selectDistrict = (d: District) => {
    setSearchParams({ state: d.state || "", district: d.district || "" });
    setQuery("");
    setStateFilter(d.state || "");
  };

  const feasibility = useMemo(() => {
    if (!data || !selected) return null;
    return assessDistrict(selected, params, data.plants);
  }, [data, selected, params]);

  const localPlants = useMemo(() => {
    if (!data || !selected) return [];
    return plantsInDistrict(data.plants, selected);
  }, [data, selected]);

  const nearby = useMemo(() => {
    if (!data || !selected?.state) return [];
    return rankDistricts(
      data.districts.filter((d) => matchesState(d.state, selected.state) && d.district !== selected.district),
      params,
      data.plants
    ).slice(0, 12);
  }, [data, selected, params]);

  const searchHits = useMemo(() => {
    if (!data || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    return data.districts
      .filter((d) => {
        if (stateFilter && !matchesState(d.state, stateFilter)) return false;
        return (
          d.district?.toLowerCase().includes(q) ||
          d.state?.toLowerCase().includes(q) ||
          d.stateCode?.toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [data, query, stateFilter]);

  const stateMetric = useMemo(() => {
    if (!data) return {};
    const m: Record<string, number> = {};
    for (const row of rankDistricts(data.districts, params, data.plants)) {
      if (!row.d.state) continue;
      m[row.d.state] = Math.max(m[row.d.state] || 0, row.feasibility.score);
    }
    return m;
  }, [data, params]);

  const active = feasibility?.pillars.find((p) => p.id === activePillar);

  if (loading) return <div className="loading">Loading district intelligence…</div>;
  if (error || !data || !selected || !feasibility) return <div className="error">{error || "No data"}</div>;

  return (
    <div className="page">
      <div className="dossier-layout">
        <aside className="side">
          <div className="panel">
            <div className="panel-head"><h2>Find a district</h2></div>
            <div className="panel-body">
              <div className="field">
                <label>State</label>
                <select
                  value={stateFilter}
                  onChange={(e) => {
                    setStateFilter(e.target.value);
                    if (e.target.value) {
                      // jump map focus; keep district until user picks
                    }
                  }}
                >
                  <option value="">All states</option>
                  {states.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Search district</label>
                <input
                  value={query}
                  placeholder="e.g. Gandhinagar, Ludhiana, Nashik"
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {searchHits.length > 0 && (
                <div className="search-results">
                  {searchHits.map((d) => (
                    <button
                      key={`${d.state}-${d.district}`}
                      type="button"
                      className={selected.district === d.district && selected.state === d.state ? "active" : ""}
                      onClick={() => selectDistrict(d)}
                    >
                      <div className="name">{d.district}</div>
                      <div className="meta">{d.state} · demand {fmt(d.currentDemandTpd, 1)} TPD</div>
                    </button>
                  ))}
                </div>
              )}
              {!query && stateFilter && (
                <div className="search-results" style={{ marginTop: "0.75rem" }}>
                  {data.districts
                    .filter((d) => matchesState(d.state, stateFilter))
                    .sort((a, b) => b.currentDemandTpd - a.currentDemandTpd)
                    .slice(0, 10)
                    .map((d) => (
                      <button
                        key={`${d.state}-${d.district}`}
                        type="button"
                        className={selected.district === d.district ? "active" : ""}
                        onClick={() => selectDistrict(d)}
                      >
                        <div className="name">{d.district}</div>
                        <div className="meta">Demand {fmt(d.currentDemandTpd, 1)} · Surplus {fmt(d.netSurplusKtpa, 0)}</div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>India</h2>
              <span className="muted">click state</span>
            </div>
            <IndiaMap
              selectedState={selected.state}
              metricByState={stateMetric}
              onSelectState={(s) => {
                setStateFilter(s || "");
                if (!s || !data) return;
                const top = rankDistricts(
                  data.districts.filter((d) => matchesState(d.state, s)),
                  params,
                  data.plants
                )[0]?.d;
                if (top) selectDistrict(top);
              }}
            />
          </div>
        </aside>

        <section className="main">
          <div className={`panel verdict ${feasibility.verdict}`}>
            <div className="verdict-badge">{feasibility.verdict}</div>
            <div>
              <h1>{selected.district}, {selected.state}</h1>
              <p>{feasibility.summary}</p>
              <div className="btn-row" style={{ marginTop: "0.75rem" }}>
                <span className="btn" style={{ cursor: "default" }}>Gov support: {selected.govSupport || "—"}</span>
                <span className="btn" style={{ cursor: "default" }}>
                  Flags: D {selected.flagDemand ? "Y" : "N"} · B {selected.flagRawMaterial ? "Y" : "N"} · P {selected.flagNearestPipeline ? "Y" : "N"}
                </span>
              </div>
            </div>
            <div className="score-ring" title="Feasibility score">{feasibility.score}</div>
          </div>

          <div className="pillars">
            {feasibility.pillars.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`pillar ${activePillar === p.id ? "active" : ""}`}
                onClick={() => setActivePillar(p.id)}
              >
                <div className="eyebrow">
                  <span>{p.label}</span>
                  <span className={`level ${p.level}`}>{p.level}</span>
                </div>
                <h3>{p.headline}</h3>
                <p>{p.detail}</p>
              </button>
            ))}
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>{active?.label} — diligence detail</h2>
            </div>
            <div className="panel-body">
              {active && (
                <>
                  <div className="metrics">
                    {active.metrics.map((m) => (
                      <div className="kv" key={m.label}>
                        <div className="k">{m.label}</div>
                        <div className="v">{m.value}</div>
                      </div>
                    ))}
                  </div>

                  {activePillar === "competition" && (
                    <div style={{ marginTop: "1rem" }}>
                      <div className="muted" style={{ marginBottom: "0.5rem" }}>
                        Plants registered in this district
                      </div>
                      {localPlants.length === 0 ? (
                        <p className="muted">No plant-level matches — workbook shows {selected.plantCount} plant(s) at district aggregate.</p>
                      ) : (
                        <div className="plant-list">
                          {localPlants.map((p) => (
                            <div className="plant-card" key={p.projectId || p.plantName || Math.random()}>
                              <h4>
                                {p.detailUrl ? (
                                  <a href={p.detailUrl} target="_blank" rel="noreferrer">{p.plantName}</a>
                                ) : (
                                  p.plantName
                                )}
                              </h4>
                              <p>
                                {p.entityName} · {p.status} · {fmt(p.capacityTpd, 1)} TPD
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                      {selected.plants.length > 0 && localPlants.length === 0 && (
                        <div className="plant-list" style={{ marginTop: "0.75rem" }}>
                          {selected.plants.map((name) => (
                            <div className="plant-card" key={name}><h4>{name}</h4></div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activePillar === "pipeline" && selected.pipelineName && (
                    <p className="muted" style={{ marginTop: "1rem" }}>
                      Offtake path hinges on access to <strong>{selected.pipelineName}</strong>
                      {selected.pipelineDistanceKm != null ? ` (~${fmt(selected.pipelineDistanceKm, 1)} km)` : ""}.
                      Treat distance as indicative from the workbook, not surveyed ROW.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Nearby districts in {selected.state}</h2>
              <button className="btn" type="button" onClick={() => navigate("/scan")}>Full scan</button>
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>District</th>
                    <th>Score</th>
                    <th>Verdict</th>
                    <th>Demand</th>
                    <th>Surplus</th>
                    <th>Pipe km</th>
                    <th>Plants</th>
                  </tr>
                </thead>
                <tbody>
                  {nearby.map(({ d, feasibility: f }) => (
                    <tr key={d.district!} onClick={() => selectDistrict(d)}>
                      <td>{d.district}</td>
                      <td>{f.score}</td>
                      <td>{f.verdict}</td>
                      <td>{fmt(d.currentDemandTpd, 1)}</td>
                      <td>{fmt(d.netSurplusKtpa, 0)}</td>
                      <td>{fmt(d.pipelineDistanceKm, 0)}</td>
                      <td>{d.plantCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
