import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useData } from "../lib/DataContext";
import { fmt } from "../lib/types";

const COLORS = ["#1f6b4a", "#c45c26", "#2f5d8a", "#b7791f", "#6b4f3a", "#4a7c59", "#8c4a3a", "#3d6b6b"];

export function InsightsPage() {
  const { data, loading, error } = useData();

  const statusMix = useMemo(() => {
    if (!data) return [];
    const m = new Map<string, number>();
    for (const p of data.plants) {
      const k = p.status || "Unknown";
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [data]);

  const topStates = useMemo(() => {
    if (!data) return [];
    return [...data.summaryStates]
      .sort((a, b) => b.plants - a.plants)
      .slice(0, 10)
      .map((s) => ({
        state: s.state?.replace(" Pradesh", " P.") || "",
        plants: s.plants,
        demand: Number(s.demandTpd.toFixed(1)),
        surplus: Number(s.surplusKtpa.toFixed(0)),
      }));
  }, [data]);

  const pipelineStats = useMemo(() => {
    if (!data) return { withPipe: 0, without: 0, avgDist: 0 };
    let withPipe = 0;
    let without = 0;
    let distSum = 0;
    let distN = 0;
    for (const d of data.districts) {
      if (d.flagNearestPipeline) withPipe += 1;
      else without += 1;
      if (d.pipelineDistanceKm != null) {
        distSum += d.pipelineDistanceKm;
        distN += 1;
      }
    }
    return { withPipe, without, avgDist: distN ? distSum / distN : 0 };
  }, [data]);

  const demandSurplus = useMemo(() => {
    if (!data) return [];
    return data.summaryStates
      .filter((s) => s.state)
      .map((s) => ({
        state: s.state!,
        demand: s.demandTpd,
        surplus: s.surplusKtpa,
        plants: s.plants,
      }))
      .sort((a, b) => b.surplus - a.surplus)
      .slice(0, 12);
  }, [data]);

  if (loading) return <div className="loading">Loading dataset…</div>;
  if (error || !data) return <div className="error">{error || "No data"}</div>;

  const totalCap = data.plants.reduce((s, p) => s + (p.capacityTpd || 0), 0);

  return (
    <div className="page">
      <div className="hero-line">
        <div>
          <h1>Business insights</h1>
          <p>Trends across plants, state demand/surplus and pipeline coverage from the Excel workbook.</p>
        </div>
      </div>

      <div className="grid-3">
        <div className="panel stat"><div className="label">Registered plants</div><div className="value">{data.meta.plantCount}</div></div>
        <div className="panel stat"><div className="label">Verified capacity (TPD)</div><div className="value">{fmt(totalCap, 0)}</div></div>
        <div className="panel stat"><div className="label">Districts with pipeline flag</div><div className="value">{pipelineStats.withPipe}</div></div>
      </div>

      <div className="grid-2" style={{ marginTop: "1rem" }}>
        <div className="panel">
          <div className="panel-head"><h2>Plant status mix</h2></div>
          <div className="panel-body" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusMix} dataKey="value" nameKey="name" outerRadius={110} label>
                  {statusMix.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Top states by plant count</h2></div>
          <div className="panel-body" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topStates}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9d0c0" />
                <XAxis dataKey="state" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="plants" fill="#1f6b4a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: "1rem" }}>
        <div className="panel">
          <div className="panel-head"><h2>State demand vs biomass surplus</h2></div>
          <div className="panel-body" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demandSurplus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9d0c0" />
                <XAxis dataKey="state" hide />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Bar yAxisId="left" dataKey="surplus" name="Surplus KTPA" fill="#2f5d8a" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="demand" name="Demand TPD" fill="#c45c26" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Pipeline snapshot</h2></div>
          <div className="panel-body">
            <div className="detail-grid">
              <div className="kv"><div className="k">Districts with pipeline flag Y</div><div className="v">{pipelineStats.withPipe}</div></div>
              <div className="kv"><div className="k">Districts without</div><div className="v">{pipelineStats.without}</div></div>
              <div className="kv"><div className="k">Avg pipeline distance (km)</div><div className="v">{fmt(pipelineStats.avgDist, 0)}</div></div>
              <div className="kv"><div className="k">NG pipelines in MIS sheet</div><div className="v">{data.meta.pipelineCount}</div></div>
            </div>
            <div className="table-wrap" style={{ marginTop: "1rem", maxHeight: 240 }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>Pipeline</th>
                    <th>Status</th>
                    <th>Op. km</th>
                    <th>Util %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pipelines.slice(0, 12).map((p) => (
                    <tr key={p.name || Math.random()} style={{ cursor: "default" }}>
                      <td>{p.name}</td>
                      <td>{p.status}</td>
                      <td>{fmt(p.operatingKm, 0)}</td>
                      <td>{fmt(p.utilisationPct, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
