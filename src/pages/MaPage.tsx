import { useMemo, useState } from "react";
import { useData } from "../lib/DataContext";
import { fmt, matchesState, scoreMaPlant, type MaParams } from "../lib/types";

const ALL_STATUSES = [
  "Functional",
  "Completed",
  "Under Construction",
  "Yet to start construction",
];

export function MaPage() {
  const { data, params, loading, error } = useData();
  const [ma, setMa] = useState<MaParams>({
    ...params,
    minCapacityTpd: 5,
    statuses: ["Functional", "Completed", "Under Construction"],
    preferLowCompetition: true,
  });

  const districtIndex = useMemo(() => {
    const m = new Map<string, (typeof data extends null ? never : NonNullable<typeof data>["districts"][0])>();
    if (!data) return m;
    for (const d of data.districts) {
      if (d.state && d.district) m.set(`${d.state}|${d.district}`.toLowerCase(), d);
    }
    return m;
  }, [data]);

  const findDistrict = (state: string | null, district: string | null) => {
    if (!state || !district || !data) return undefined;
    const exact = districtIndex.get(`${state}|${district}`.toLowerCase());
    if (exact) return exact;
    return data.districts.find(
      (d) => matchesState(d.state, state) && d.district?.toLowerCase() === district.toLowerCase()
    );
  };

  const ranked = useMemo(() => {
    if (!data) return [];
    return data.plants
      .map((plant) => {
        const district = findDistrict(plant.state, plant.district);
        const scored = scoreMaPlant(plant, district, ma);
        return { plant, district, ...scored };
      })
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score);
  }, [data, ma, districtIndex]);

  if (loading) return <div className="loading">Loading dataset…</div>;
  if (error || !data) return <div className="error">{error || "No data"}</div>;

  const toggleStatus = (s: string) => {
    setMa((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(s)
        ? prev.statuses.filter((x) => x !== s)
        : [...prev.statuses, s],
    }));
  };

  return (
    <div className="page">
      <div className="hero-line">
        <div>
          <h1>M&A options</h1>
          <p>Parameterised shortlist of CBG plants that look interesting for acquisition or partnership, joined to district demand / biomass / pipeline.</p>
        </div>
        <span className="pill">{ranked.length} plants</span>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head"><h2>Opportunity filters</h2></div>
          <div className="panel-body controls">
            <div className="field">
              <label>Min plant capacity (TPD)</label>
              <input type="number" value={ma.minCapacityTpd} onChange={(e) => setMa({ ...ma, minCapacityTpd: Number(e.target.value) })} />
            </div>
            <div className="field">
              <label>District min demand (TPD)</label>
              <input type="number" value={ma.netCbgDemandTpd} onChange={(e) => setMa({ ...ma, netCbgDemandTpd: Number(e.target.value) })} />
            </div>
            <div className="field">
              <label>District min biomass (KTPA)</label>
              <input type="number" value={ma.netBiomassSurplusKtpa} onChange={(e) => setMa({ ...ma, netBiomassSurplusKtpa: Number(e.target.value) })} />
            </div>
            <div className="field">
              <label>Statuses</label>
              <div className="btn-row">
                {ALL_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`btn ${ma.statuses.includes(s) ? "primary" : ""}`}
                    onClick={() => toggleStatus(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={ma.preferLowCompetition}
                onChange={(e) => setMa({ ...ma, preferLowCompetition: e.target.checked })}
              />
              Prefer low-competition districts (≤2 plants)
            </label>
          </div>
        </div>

        <div className="grid-3" style={{ alignContent: "start" }}>
          <div className="panel stat"><div className="label">Shortlist</div><div className="value">{ranked.length}</div></div>
          <div className="panel stat"><div className="label">Avg capacity</div><div className="value">{fmt(ranked.reduce((s, x) => s + (x.plant.capacityTpd || 0), 0) / Math.max(1, ranked.length), 1)}</div></div>
          <div className="panel stat"><div className="label">Functional in list</div><div className="value">{ranked.filter((x) => x.plant.status === "Functional").length}</div></div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: "1rem" }}>
        <div className="panel-head"><h2>Potential plants</h2></div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Score</th>
                <th>Plant</th>
                <th>Entity</th>
                <th>State</th>
                <th>District</th>
                <th>Status</th>
                <th>Cap TPD</th>
                <th>Dist. demand</th>
                <th>Dist. surplus</th>
                <th>Pipeline</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              {ranked.slice(0, 150).map(({ plant, district, score, reasons }) => (
                <tr key={plant.projectId || plant.sn || plant.plantName || Math.random()}>
                  <td>{score}</td>
                  <td>
                    {plant.detailUrl ? (
                      <a href={plant.detailUrl} target="_blank" rel="noreferrer">{plant.plantName}</a>
                    ) : (
                      plant.plantName
                    )}
                  </td>
                  <td>{plant.entityName}</td>
                  <td>{plant.state}</td>
                  <td>{plant.district}</td>
                  <td>{plant.status}</td>
                  <td>{fmt(plant.capacityTpd, 1)}</td>
                  <td>{fmt(district?.currentDemandTpd, 2)}</td>
                  <td>{fmt(district?.netSurplusKtpa, 1)}</td>
                  <td>{district?.flagNearestPipeline ? "Y" : "N"}</td>
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
