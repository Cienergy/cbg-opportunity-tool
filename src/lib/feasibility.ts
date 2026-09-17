import type { ControlParams, District, Plant } from "./types";
import { matchesState, normalizeStateName } from "./types";
import type { GasCatchment } from "./gasCatchment";

export type PillarLevel = "strong" | "ok" | "weak";

export type Pillar = {
  id: "demand" | "biomass" | "pipeline" | "competition";
  label: string;
  level: PillarLevel;
  headline: string;
  detail: string;
  metrics: { label: string; value: string }[];
};

export type Feasibility = {
  score: number; // 0-100
  verdict: "Invest" | "Watch" | "Pass";
  summary: string;
  pillars: Pillar[];
};

function levelFrom(scorePart: number): PillarLevel {
  if (scorePart >= 75) return "strong";
  if (scorePart >= 45) return "ok";
  return "weak";
}

export function fmt(n: number | null | undefined, digits = 1) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: digits });
}

export function normDistrict(name: string | null | undefined) {
  return (name || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function districtKey(state: string | null | undefined, district: string | null | undefined) {
  return `${normalizeStateName(state)}|${normDistrict(district)}`;
}

export function plantsInDistrict(plants: Plant[], d: District) {
  const target = normDistrict(d.district);
  return plants.filter((p) => {
    if (!matchesState(p.state, d.state)) return false;
    const pd = normDistrict(p.district);
    return pd === target || pd.includes(target) || target.includes(pd);
  });
}

export function assessDistrict(
  d: District,
  params: ControlParams,
  plants: Plant[] = [],
  catchment?: GasCatchment | null
): Feasibility {
  const localPlants = plantsInDistrict(plants, d);
  const functional = localPlants.filter((p) => /functional|completed/i.test(p.status || "")).length
    || d.functionalCompleted;
  const under = localPlants.filter((p) => /under construction/i.test(p.status || "")).length
    || d.underConstruction;
  const yet = localPlants.filter((p) => /yet to start/i.test(p.status || "")).length
    || d.yetToStart;
  const totalPlants = Math.max(d.plantCount, localPlants.length);
  const totalCap = localPlants.reduce((s, p) => s + (p.capacityTpd || 0), 0) || d.capacityTpd;

  const demandNow = catchment?.addressableNow ?? d.currentDemandTpd;
  const demand5y = catchment?.addressable5y ?? d.futureDemandTpd;

  // Demand pillar (0-100) — uses addressable (district/home GA + nearby GAs) when available
  let demandPts = 0;
  if (demandNow >= params.netCbgDemandTpd * 2) demandPts += 45;
  else if (demandNow >= params.netCbgDemandTpd) demandPts += 32;
  else if (demandNow >= params.netCbgDemandTpd * 0.5) demandPts += 16;

  if (demand5y >= params.netEstDemand5yTpd * 2) demandPts += 35;
  else if (demand5y >= params.netEstDemand5yTpd) demandPts += 25;
  else if (demand5y >= params.netEstDemand5yTpd * 0.5) demandPts += 12;

  if (catchment && catchment.nearby.length > 0) demandPts += 10;
  if (d.cngStations >= 20) demandPts += 10;
  else if (d.cngStations >= 5) demandPts += 5;
  demandPts = Math.min(100, demandPts);

  const demand: Pillar = {
    id: "demand",
    label: "Demand",
    level: levelFrom(demandPts),
    headline:
      demandPts >= 75
        ? "Strong offtake (incl. nearby GAs)"
        : demandPts >= 45
          ? "Moderate addressable demand"
          : "Thin offtake catchment",
    detail: `${fmt(demandNow, 1)} → ${fmt(demand5y, 1)} TPD`,
    metrics: [
      { label: "Addressable now", value: `${fmt(demandNow, 2)} TPD` },
      { label: "Addressable 5Y", value: `${fmt(demand5y, 2)} TPD` },
      { label: "District only", value: `${fmt(d.currentDemandTpd, 2)} TPD` },
      { label: "Growth", value: catchment ? `${fmt(catchment.growthMultiple, 1)}× · CAGR ${fmt(catchment.cagrPct, 1)}%` : `${fmt(d.futureDemandTpd, 1)} TPD @5Y` },
    ],
  };

  // Biomass
  let bioPts = 0;
  if (d.netSurplusKtpa >= params.netBiomassSurplusKtpa * 2) bioPts += 70;
  else if (d.netSurplusKtpa >= params.netBiomassSurplusKtpa) bioPts += 55;
  else if (d.netSurplusKtpa >= params.netBiomassSurplusKtpa * 0.5) bioPts += 28;
  else if (d.netSurplusKtpa > 0) bioPts += 12;
  if (d.feedstockUsedTpd > 0 && d.netSurplusKtpa > params.netBiomassSurplusKtpa) bioPts += 10;
  if ((d.riceSurplus || 0) + (d.wheatSurplus || 0) + (d.maizeSurplus || 0) > 0) bioPts += 10;
  bioPts = Math.min(100, bioPts);

  const biomass: Pillar = {
    id: "biomass",
    label: "Biomass",
    level: levelFrom(bioPts),
    headline:
      bioPts >= 75
        ? "Healthy surplus feedstock"
        : bioPts >= 45
          ? "Adequate surplus"
          : "Feedstock constrained",
    detail: `${fmt(d.netSurplusKtpa, 0)} KTPA surplus`,
    metrics: [
      { label: "Net surplus", value: `${fmt(d.netSurplusKtpa, 1)} KTPA` },
      { label: "Gross surplus", value: `${fmt(d.grossSurplusKtpa, 1)} KTPA` },
      { label: "Rice / Wheat / Maize", value: `${fmt(d.riceSurplus, 1)} / ${fmt(d.wheatSurplus, 1)} / ${fmt(d.maizeSurplus, 1)}` },
      { label: "Feedstock used", value: `${fmt(d.feedstockUsedTpd, 1)} TPD` },
    ],
  };

  // Pipeline
  let pipePts = 0;
  const dist = d.pipelineDistanceKm;
  if (d.flagNearestPipeline) pipePts += 35;
  if (dist != null) {
    if (dist <= 25) pipePts += 50;
    else if (dist <= 75) pipePts += 35;
    else if (dist <= params.nearestPipelineKm) pipePts += 20;
    else pipePts += 5;
  } else if (d.pipelineName) {
    pipePts += 25;
  }
  if (d.pipelineMmscmd && d.pipelineMmscmd >= 20) pipePts += 15;
  else if (d.pipelineMmscmd && d.pipelineMmscmd > 0) pipePts += 8;
  pipePts = Math.min(100, pipePts);

  const pipeline: Pillar = {
    id: "pipeline",
    label: "Pipeline",
    level: levelFrom(pipePts),
    headline:
      pipePts >= 75
        ? "Close to gas infrastructure"
        : pipePts >= 45
          ? "Reachable pipeline"
          : "Weak pipeline access",
    detail: d.pipelineName ? `${d.pipelineName} · ${fmt(dist, 0)} km` : "No pipeline linked",
    metrics: [
      { label: "Pipeline", value: d.pipelineName || "Not linked" },
      { label: "Distance", value: dist != null ? `${fmt(dist, 1)} km` : "—" },
      { label: "Type", value: d.pipelineType || "—" },
      { label: "Capacity", value: d.pipelineMmscmd != null ? `${fmt(d.pipelineMmscmd, 1)} MMSCMD` : "—" },
    ],
  };

  // Competition — whitespace is good for greenfield; some presence OK for M&A
  let compPts = 0;
  if (totalPlants === 0) {
    compPts = 88;
  } else if (functional === 0 && under + yet <= 2) {
    compPts = 70;
  } else if (totalPlants <= 2) {
    compPts = 58;
  } else if (totalPlants <= 4) {
    compPts = 40;
  } else {
    compPts = 22;
  }
  // If demand is high and few functional, still interesting
  if (functional === 0 && d.currentDemandTpd >= params.netCbgDemandTpd) compPts = Math.max(compPts, 65);

  const competition: Pillar = {
    id: "competition",
    label: "Competition",
    level: levelFrom(compPts),
    headline:
      totalPlants === 0
        ? "Open district — no CBG plants"
        : functional === 0
          ? "No live plants yet"
          : `${functional} live plant${functional === 1 ? "" : "s"} already in`,
    detail: `${totalPlants} plants · ${fmt(totalCap, 0)} TPD`,
    metrics: [
      { label: "Total plants", value: String(totalPlants) },
      { label: "Functional / completed", value: String(functional) },
      { label: "Under construction", value: String(under) },
      { label: "Capacity in district", value: `${fmt(totalCap, 1)} TPD` },
    ],
  };

  const pillars = [demand, biomass, pipeline, competition];
  const score = Math.round(
    demandPts * 0.3 + bioPts * 0.3 + pipePts * 0.25 + compPts * 0.15
  );

  const strongCount = pillars.filter((p) => p.level === "strong").length;
  const weakCount = pillars.filter((p) => p.level === "weak").length;

  let verdict: Feasibility["verdict"] = "Watch";
  if (score >= 70 && weakCount === 0) verdict = "Invest";
  else if (score >= 60 && strongCount >= 2 && weakCount <= 1) verdict = "Invest";
  else if (score < 45 || weakCount >= 3) verdict = "Pass";

  const summary =
    verdict === "Invest"
      ? "Demand, feedstock and offtake look aligned."
      : verdict === "Watch"
        ? "Mixed — size and feedstock need diligence."
        : "Weak on current thresholds.";

  return { score, verdict, summary, pillars };
}

export function assessGa(g: import("./types").GA, params: ControlParams): Feasibility {
  const demandNow = g.currentDemandTpd || 0;
  const demand5y = g.futureDemandTpd || 0;

  let demandPts = 0;
  if (demandNow >= params.netCbgDemandTpd * 2) demandPts += 45;
  else if (demandNow >= params.netCbgDemandTpd) demandPts += 32;
  else if (demandNow >= params.netCbgDemandTpd * 0.5) demandPts += 16;
  if (demand5y >= params.netEstDemand5yTpd * 2) demandPts += 35;
  else if (demand5y >= params.netEstDemand5yTpd) demandPts += 25;
  else if (demand5y >= params.netEstDemand5yTpd * 0.5) demandPts += 12;
  if ((g.cngStations || 0) >= 20) demandPts += 10;
  else if ((g.cngStations || 0) >= 5) demandPts += 5;
  demandPts = Math.min(100, demandPts);

  const growth =
    demandNow > 0 ? demand5y / demandNow : demand5y > 0 ? 2 : 1;

  const demand: Pillar = {
    id: "demand",
    label: "Demand",
    level: levelFrom(demandPts),
    headline:
      demandPts >= 75 ? "Strong GA offtake" : demandPts >= 45 ? "Moderate GA demand" : "Thin GA demand",
    detail: `${fmt(demandNow, 1)} → ${fmt(demand5y, 1)} TPD · ${fmt(growth, 1)}×`,
    metrics: [
      { label: "Current demand", value: `${fmt(demandNow, 2)} TPD` },
      { label: "5Y demand", value: `${fmt(demand5y, 2)} TPD` },
      { label: "CNG stations", value: fmt(g.cngStations, 0) },
      { label: "PNG households", value: fmt(g.pngHh, 0) },
    ],
  };

  let bioPts = 0;
  if (g.netSurplusKtpa >= params.netBiomassSurplusKtpa * 2) bioPts += 70;
  else if (g.netSurplusKtpa >= params.netBiomassSurplusKtpa) bioPts += 55;
  else if (g.netSurplusKtpa >= params.netBiomassSurplusKtpa * 0.5) bioPts += 28;
  else if (g.netSurplusKtpa > 0) bioPts += 12;
  bioPts = Math.min(100, bioPts);

  const biomass: Pillar = {
    id: "biomass",
    label: "Biomass",
    level: levelFrom(bioPts),
    headline:
      bioPts >= 75 ? "Healthy surplus in GA" : bioPts >= 45 ? "Adequate surplus" : "Feedstock tight",
    detail: `${fmt(g.netSurplusKtpa, 0)} KTPA surplus`,
    metrics: [
      { label: "Net surplus", value: `${fmt(g.netSurplusKtpa, 1)} KTPA` },
      { label: "Gross surplus", value: `${fmt(g.grossSurplusKtpa, 1)} KTPA` },
      { label: "Feedstock used", value: `${fmt(g.feedstockUsedTpd, 1)} TPD` },
      { label: "Gov support", value: g.govSupport || "—" },
    ],
  };

  let pipePts = 0;
  if (g.flagNearestPipeline) pipePts += 40;
  if (g.pipelineName) pipePts += 25;
  if (g.pipelineMmscmd && g.pipelineMmscmd >= 20) pipePts += 20;
  else if (g.pipelineMmscmd && g.pipelineMmscmd > 0) pipePts += 10;
  if (g.pipelineDistanceKm != null && g.pipelineDistanceKm > 0) pipePts += 10;
  pipePts = Math.min(100, pipePts);

  const pipeline: Pillar = {
    id: "pipeline",
    label: "Pipeline",
    level: levelFrom(pipePts),
    headline: pipePts >= 75 ? "Pipeline-backed GA" : pipePts >= 45 ? "Partial infra link" : "Weak pipeline story",
    detail: g.pipelineName ? `${g.pipelineName}` : "No pipeline linked",
    metrics: [
      { label: "Pipeline", value: g.pipelineName || "—" },
      { label: "Type", value: g.pipelineType || "—" },
      { label: "Distance / length", value: fmt(g.pipelineDistanceKm, 0) },
      { label: "Capacity", value: g.pipelineMmscmd != null ? `${fmt(g.pipelineMmscmd, 1)} MMSCMD` : "—" },
    ],
  };

  const total = g.plantCount || 0;
  let compPts = 0;
  if (total === 0) compPts = 88;
  else if ((g.functionalCompleted || 0) === 0 && total <= 2) compPts = 70;
  else if (total <= 2) compPts = 55;
  else if (total <= 4) compPts = 40;
  else compPts = 22;

  const competition: Pillar = {
    id: "competition",
    label: "Competition",
    level: levelFrom(compPts),
    headline:
      total === 0
        ? "White-space GA"
        : `${g.functionalCompleted || 0} live · ${total} total plants`,
    detail: `${fmt(g.capacityTpd, 0)} TPD capacity`,
    metrics: [
      { label: "Plants", value: String(total) },
      { label: "Functional", value: String(g.functionalCompleted || 0) },
      { label: "Under construction", value: String(g.underConstruction || 0) },
      { label: "Capacity", value: `${fmt(g.capacityTpd, 1)} TPD` },
    ],
  };

  const pillars = [demand, biomass, pipeline, competition];
  const score = Math.round(demandPts * 0.3 + bioPts * 0.3 + pipePts * 0.25 + compPts * 0.15);
  const strongCount = pillars.filter((p) => p.level === "strong").length;
  const weakCount = pillars.filter((p) => p.level === "weak").length;

  let verdict: Feasibility["verdict"] = "Watch";
  if (score >= 70 && weakCount === 0) verdict = "Invest";
  else if (score >= 60 && strongCount >= 2 && weakCount <= 1) verdict = "Invest";
  else if (score < 45 || weakCount >= 3) verdict = "Pass";

  const summary =
    verdict === "Invest"
      ? "Demand, biomass and infra look aligned."
      : verdict === "Watch"
        ? "Mixed — plant size needs diligence."
        : "Weak on current thresholds.";

  return { score, verdict, summary, pillars };
}

export function rankDistricts(districts: District[], params: ControlParams, plants: Plant[]) {
  return districts
    .map((d) => ({ d, feasibility: assessDistrict(d, params, plants) }))
    .sort((a, b) => b.feasibility.score - a.feasibility.score);
}

export function rankGas(gas: import("./types").GA[], params: ControlParams) {
  return gas
    .map((g) => ({ g, feasibility: assessGa(g, params) }))
    .sort((a, b) => b.feasibility.score - a.feasibility.score);
}
