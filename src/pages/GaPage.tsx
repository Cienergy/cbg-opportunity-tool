import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { IndiaMap } from "../components/IndiaMap";
import { useData } from "../lib/DataContext";
import { assessGa, fmt, rankGas, type Pillar } from "../lib/feasibility";
import { gaCoversDistrict } from "../lib/gasCatchment";
import { matchesState, type GA } from "../lib/types";

const COLORS = ["#0d9488", "#f59e0b", "#3b82f6", "#f43f5e", "#8b5cf6", "#10b981"];

export function GaPage() {
  const { data, params, loading, error } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [activePillar, setActivePillar] = useState<Pillar["id"]>("demand");

  const ranked = useMemo(() => {
    if (!data) return [];
    return rankGas(data.gas, params);
  }, [data, params]);

  const selected = useMemo(() => {
    if (!data) return null;
    const id = searchParams.get("ga");
    if (id) {
      return data.gas.find((g) => String(g.gaId) === id) || null;
    }
    return ranked[0]?.g || data.gas[0] || null;
  }, [data, searchParams, ranked]);

  useEffect(() => {
    if (!selected?.gaId || searchParams.get("ga")) return;
    setSearchParams({ ga: String(selected.gaId) }, { replace: true });
  }, [selected, searchParams, setSearchParams]);

  const selectGa = (g: GA) => {
    if (g.gaId) setSearchParams({ ga: String(g.gaId) });
    setQuery("");
    setStateFilter(g.state || "");
  };

  const feasibility = useMemo(() => {
    if (!selected) return null;
    return assessGa(selected, params);
  }, [selected, params]);

  const coveredDistricts = useMemo(() => {
    if (!data || !selected) return [];
    return data.districts
      .filter((d) => {
        if (!matchesState(d.state, selected.state) && !(selected.state || "").toLowerCase().includes((d.state || "").toLowerCase().split(" ")[0])) {
          // still try area match across state string
        }
        return gaCoversDistrict(selected.area, d.district);
      })
      .sort((a, b) => b.currentDemandTpd - a.currentDemandTpd);
  }, [data, selected]);

  const searchHits = useMemo(() => {
    if (!data || query.trim().length < 1) {
      if (!stateFilter || !data) return [];
      return ranked
        .filter((r) => matchesState(r.g.state, stateFilter) || (r.g.state || "").includes(stateFilter))
        .slice(0, 14)
        .map((r) => r.g);
    }
    const q = query.trim().toLowerCase();
    return data.gas
      .filter((g) => {
        if (stateFilter && !(matchesState(g.state, stateFilter) || (g.state || "").includes(stateFilter))) return false;
        return (
          g.area?.toLowerCase().includes(q) ||
          g.gaId?.toLowerCase().includes(q) ||
          g.entity?.toLowerCase().includes(q) ||
          g.state?.toLowerCase().includes(q)
        );
      })
      .slice(0, 14);
  }, [data, query, stateFilter, ranked]);

  const states = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.gas.map((g) => g.state).filter(Boolean))].sort() as string[];
  }, [data]);

  const stateMetric = useMemo(() => {
    const m: Record<string, number> = {};
    for (const { g, feasibility: f } of ranked) {
      const s = (g.state || "").split(/[,&\n]/)[0].trim();
      if (!s) continue;
      m[s] = Math.max(m[s] || 0, f.score);
    }
    return m;
  }, [ranked]);

  const growth = useMemo(() => {
    if (!selected) return [];
    return [0, 1, 2, 3, 4, 5].map((y) => {
      const t = y / 5;
      const lerp = (a: number, b: number) => a + (b - a) * t;
      return {
        year: `Y${y}`,
        demand: Number(lerp(selected.currentDemandTpd || 0, selected.futureDemandTpd || 0).toFixed(2)),
      };
    });
  }, [selected]);
  if (loading) return <div className="loading">Loading GA intelligence…</div>;
  if (error || !data || !selected || !feasibility) return <div className="error">{error || "No data"}</div>;

  const active = feasibility.pillars.find((p) => p.id === activePillar);
  const multiple =
    selected.currentDemandTpd > 0
      ? selected.futureDemandTpd / selected.currentDemandTpd
      : 0;

  const statusMix = [
    { name: "Functional", value: selected.functionalCompleted || 0 },
    { name: "Under construction", value: selected.underConstruction || 0 },
    { name: "Yet to start", value: selected.yetToStart || 0 },
  ].filter((x) => x.value > 0);

  const kpis = [
    { label: "Demand now", value: `${fmt(selected.currentDemandTpd, 1)}`, unit: "TPD", tone: "teal" },
    { label: "Demand 5Y", value: `${fmt(selected.futureDemandTpd, 1)}`, unit: "TPD", tone: "blue" },
    { label: "Biomass", value: `${fmt(selected.netSurplusKtpa, 0)}`, unit: "KTPA", tone: "amber" },
    { label: "Score", value: `${feasibility.score}`, unit: feasibility.verdict, tone: "rose" },
  ];

  return (
    <div className="page">
      <div className="scan-hero">
        <div>
          <p className="eyebrow-tag">Geographical Areas</p>
          <h1>GA offtake desk</h1>
          <p>
            Screen CGD GAs the same way you screen districts — demand growth, biomass, pipeline and competition —
            then drill into covered districts.
          </p>
        </div>
      </div>

      <div className="kpi-row">
        {kpis.map((k) => (
          <div key={k.label} className={`kpi-card tone-${k.tone}`}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}<span>{k.unit}</span></div>
          </div>
        ))}
      </div>

      <div className="dossier-layout">
        <aside className="side">
          <div className="panel">
            <div className="panel-head"><h2>Find a GA</h2></div>
            <div className="panel-body">
              <div className="field">
                <label>State</label>
                <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                  <option value="">All states</option>
                  {states.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Search area / entity / GA ID</label>
                <input
                  value={query}
                  placeholder="e.g. Valsad, IGL, 98.10"
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="search-results">
                {(searchHits.length ? searchHits : ranked.slice(0, 10).map((r) => r.g)).map((g) => (
                  <button
                    key={`${g.gaId}-${g.area}`}
                    type="button"
                    className={selected.gaId === g.gaId ? "active" : ""}
                    onClick={() => selectGa(g)}
                  >
                    <div className="name">{g.area}</div>
                    <div className="meta">
                      {g.gaId} · {g.entity} · {fmt(g.currentDemandTpd, 1)} TPD
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><h2>Map</h2><span className="muted">by state score</span></div>
            <IndiaMap
              selectedState={(selected.state || "").split(/[,&\n]/)[0].trim()}
              metricByState={stateMetric}
              onSelectState={(s) => {
                setStateFilter(s || "");
                const top = ranked.find((r) => matchesState(r.g.state, s) || (r.g.state || "").includes(s || ""));
                if (top) selectGa(top.g);
              }}
            />
          </div>
        </aside>

        <section className="main">
          <div className={`panel verdict ${feasibility.verdict}`}>
            <div className="verdict-badge">{feasibility.verdict}</div>
            <div>
              <h1>{selected.area}</h1>
              <p>
                GA {selected.gaId} · {selected.entity} · {selected.state}
                {selected.authDate ? ` · auth ${selected.authDate}` : ""}
              </p>
              <p style={{ marginTop: "0.45rem" }}>{feasibility.summary}</p>
              <div className="btn-row" style={{ marginTop: "0.75rem" }}>
                <span className="btn" style={{ cursor: "default" }}>Growth {fmt(multiple, 1)}×</span>
                <span className="btn" style={{ cursor: "default" }}>Pipeline {selected.flagNearestPipeline ? "Y" : "N"}</span>
                <span className="btn" style={{ cursor: "default" }}>{selected.plantCount} plants</span>
              </div>
            </div>
            <div className="score-ring">{feasibility.score}</div>
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

          <div className="charts-grid">
            <div className="panel">
              <div className="panel-head"><h2>GA demand growth</h2><span className="muted">{fmt(multiple, 1)}× to Y5</span></div>
              <div className="panel-body chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growth}>
                    <defs>
                      <linearGradient id="gaDemand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0d9488" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#0d9488" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
                    <XAxis dataKey="year" />
                    <YAxis width={42} />
                    <Tooltip />
                    <Area type="monotone" dataKey="demand" name="Demand TPD" stroke="#0d9488" fill="url(#gaDemand)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head"><h2>Competition in GA</h2></div>
              <div className="panel-body chart-box">
                {statusMix.length === 0 ? (
                  <p className="muted">White space — no registered plants.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusMix} dataKey="value" nameKey="name" innerRadius={52} outerRadius={90} paddingAngle={3}>
                        {statusMix.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panel-head"><h2>Demand vs biomass</h2></div>
              <div className="panel-body chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Demand now", value: Number((selected.currentDemandTpd || 0).toFixed(2)) },
                      { name: "Demand 5Y", value: Number((selected.futureDemandTpd || 0).toFixed(2)) },
                      { name: "Surplus KTPA", value: Number((selected.netSurplusKtpa || 0).toFixed(1)) },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis width={40} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      <Cell fill="#0d9488" />
                      <Cell fill="#3b82f6" />
                      <Cell fill="#f59e0b" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head"><h2>{active?.label} detail</h2></div>
              <div className="panel-body">
                {active && (
                  <div className="metrics">
                    {active.metrics.map((m) => (
                      <div className="kv" key={m.label}>
                        <div className="k">{m.label}</div>
                        <div className="v">{m.value}</div>
                      </div>
                    ))}
                  </div>
                )}
                {selected.plants?.length > 0 && activePillar === "competition" && (
                  <div className="plant-list" style={{ marginTop: "1rem" }}>
                    {selected.plants.map((p) => (
                      <div className="plant-card" key={p}><h4>{p}</h4></div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Districts covered by this GA</h2>
              <span className="muted">{coveredDistricts.length} matched</span>
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>District</th>
                    <th>State</th>
                    <th>Demand</th>
                    <th>Surplus</th>
                    <th>Pipe km</th>
                    <th>Plants</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {coveredDistricts.map((d) => (
                    <tr key={`${d.state}-${d.district}`}>
                      <td>{d.district}</td>
                      <td>{d.state}</td>
                      <td>{fmt(d.currentDemandTpd, 1)}</td>
                      <td>{fmt(d.netSurplusKtpa, 0)}</td>
                      <td>{fmt(d.pipelineDistanceKm, 0)}</td>
                      <td>{d.plantCount}</td>
                      <td>
                        <Link
                          to={`/?state=${encodeURIComponent(d.state || "")}&district=${encodeURIComponent(d.district || "")}`}
                          style={{ color: "var(--accent)", fontWeight: 600 }}
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {coveredDistricts.length === 0 && (
                    <tr style={{ cursor: "default" }}>
                      <td colSpan={7}>No district names matched this GA area string.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><h2>Top GAs by score</h2></div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>GA</th>
                    <th>State</th>
                    <th>Score</th>
                    <th>Verdict</th>
                    <th>Demand</th>
                    <th>5Y</th>
                    <th>Surplus</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.slice(0, 40).map(({ g, feasibility: f }, i) => (
                    <tr
                      key={`${g.gaId}-${g.area}`}
                      className={selected.gaId === g.gaId ? "active" : ""}
                      onClick={() => selectGa(g)}
                    >
                      <td>{i + 1}</td>
                      <td>{g.area}</td>
                      <td>{g.state}</td>
                      <td>{f.score}</td>
                      <td>{f.verdict}</td>
                      <td>{fmt(g.currentDemandTpd, 1)}</td>
                      <td>{fmt(g.futureDemandTpd, 1)}</td>
                      <td>{fmt(g.netSurplusKtpa, 0)}</td>
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
