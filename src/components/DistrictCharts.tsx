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
import type { GasCatchment } from "../lib/gasCatchment";
import { fmt } from "../lib/feasibility";
import type { District, Plant } from "../lib/types";

const COLORS = ["#0f5c45", "#9a4d1c", "#2f5d8a", "#8a6a1f", "#6b4f3a", "#4a7c59"];

type Props = {
  district: District;
  catchment: GasCatchment;
  plants: Plant[];
};

export function DistrictCharts({ district, catchment, plants }: Props) {
  const growthStack = [
    {
      period: "Today",
      "Home GA": Number(catchment.homeDemandNow.toFixed(2)) || Number(catchment.districtDemandNow.toFixed(2)),
      "Nearby GAs": Number(catchment.nearbyDemandNow.toFixed(2)),
    },
    {
      period: "Year 5",
      "Home GA": Number(catchment.homeDemand5y.toFixed(2)) || Number(catchment.districtDemand5y.toFixed(2)),
      "Nearby GAs": Number(catchment.nearbyDemand5y.toFixed(2)),
    },
  ];

  const trajectory = [0, 1, 2, 3, 4, 5].map((y) => {
    const t = y / 5;
    const lerp = (a: number, b: number) => a + (b - a) * t;
    return {
      year: `Y${y}`,
      district: Number(lerp(catchment.districtDemandNow, catchment.districtDemand5y).toFixed(2)),
      addressable: Number(lerp(catchment.addressableNow, catchment.addressable5y).toFixed(2)),
    };
  });

  const biomass = [
    { name: "Rice", value: district.riceSurplus || 0 },
    { name: "Wheat", value: district.wheatSurplus || 0 },
    { name: "Maize", value: district.maizeSurplus || 0 },
  ].filter((x) => x.value > 0);

  const otherBio = Math.max(
    0,
    (district.netSurplusKtpa || 0) - biomass.reduce((s, x) => s + x.value, 0)
  );
  if (otherBio > 0.5) biomass.push({ name: "Other / residual", value: otherBio });

  const statusMix = ["Functional", "Completed", "Under Construction", "Yet to start construction"].map(
    (status) => ({
      name: status.replace(" construction", "").replace("Yet to start", "Yet to start"),
      value: plants.filter((p) => (p.status || "") === status).length,
    })
  ).filter((x) => x.value > 0);

  if (statusMix.length === 0 && district.plantCount > 0) {
    statusMix.push(
      { name: "Functional", value: district.functionalCompleted },
      { name: "Under construction", value: district.underConstruction },
      { name: "Yet to start", value: district.yetToStart }
    );
  }

  const gaBars = [...catchment.home, ...catchment.nearby]
    .map((l) => ({
      name: `${l.ga.gaId || ""} ${l.ga.area || ""}`.trim().slice(0, 28),
      now: Number((l.ga.currentDemandTpd || 0).toFixed(2)),
      y5: Number((l.ga.futureDemandTpd || 0).toFixed(2)),
      role: l.role,
    }))
    .sort((a, b) => b.y5 - a.y5)
    .slice(0, 10);

  const infraGrowth = [
    { metric: "CNG stations", Today: catchment.cngNow, "Year 5": catchment.cng5y },
    {
      metric: "PNG HH (k)",
      Today: Number((catchment.pngNow / 1000).toFixed(1)),
      "Year 5": Number((catchment.png5y / 1000).toFixed(1)),
    },
  ];

  return (
    <div className="charts-grid">
      <div className="panel">
        <div className="panel-head">
          <h2>Addressable demand growth</h2>
          <span className="muted">
            {fmt(catchment.growthMultiple, 1)}× · CAGR {fmt(catchment.cagrPct, 1)}%
          </span>
        </div>
        <div className="panel-body chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={growthStack}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
              <XAxis dataKey="period" />
              <YAxis unit=" TPD" width={48} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Home GA" stackId="a" fill="#0f5c45" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Nearby GAs" stackId="a" fill="#9a4d1c" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="chart-note">
            Policy view: offtake can include home GA plus nearby GAs covering peer districts in the same state.
            Addressable now <strong>{fmt(catchment.addressableNow, 1)} TPD</strong> → 5Y{" "}
            <strong>{fmt(catchment.addressable5y, 1)} TPD</strong>.
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Location growth path</h2>
          <span className="muted">district vs addressable (interpolated)</span>
        </div>
        <div className="panel-body chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trajectory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
              <XAxis dataKey="year" />
              <YAxis width={48} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="district" name="District only" stroke="#2f5d8a" fill="#2f5d8a33" />
              <Area type="monotone" dataKey="addressable" name="With nearby GAs" stroke="#0f5c45" fill="#0f5c4533" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Nearby GA offtake map</h2></div>
        <div className="panel-body chart-box tall">
          {gaBars.length === 0 ? (
            <p className="muted">No GA matches found for this district / peers.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gaBars} layout="vertical" margin={{ left: 24, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="now" name="Today TPD" fill="#2f5d8a" />
                <Bar dataKey="y5" name="5Y TPD" fill="#0f5c45" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h2>CGD network growth</h2></div>
        <div className="panel-body chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={infraGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0d8cc" />
              <XAxis dataKey="metric" />
              <YAxis width={40} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Today" fill="#8a6a1f" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Year 5" fill="#0f5c45" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Biomass mix</h2><span className="muted">KTPA</span></div>
        <div className="panel-body chart-box">
          {biomass.length === 0 ? (
            <p className="muted">No crop surplus break-up for this district.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={biomass} dataKey="value" nameKey="name" innerRadius={48} outerRadius={88} paddingAngle={2}>
                  {biomass.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${fmt(Number(v), 1)} KTPA`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Competition mix</h2></div>
        <div className="panel-body chart-box">
          {statusMix.every((x) => !x.value) ? (
            <p className="muted">No plants — open district.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusMix.filter((x) => x.value > 0)} dataKey="value" nameKey="name" outerRadius={88}>
                  {statusMix.map((_, i) => (
                    <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
