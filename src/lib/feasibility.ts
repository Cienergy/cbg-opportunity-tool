import type { ControlParams, District, Plant } from "./types";
import { matchesState, normalizeStateName } from "./types";

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

export function assessDistrict(d: District, params: ControlParams, plants: Plant[] = []): Feasibility {
  const localPlants = plantsInDistrict(plants, d);
  const functional = localPlants.filter((p) => /functional|completed/i.test(p.status || "")).length
    || d.functionalCompleted;
  const under = localPlants.filter((p) => /under construction/i.test(p.status || "")).length
    || d.underConstruction;
  const yet = localPlants.filter((p) => /yet to start/i.test(p.status || "")).length
    || d.yetToStart;
  const totalPlants = Math.max(d.plantCount, localPlants.length);
  const totalCap = localPlants.reduce((s, p) => s + (p.capacityTpd || 0), 0) || d.capacityTpd;

  // Demand pillar (0-100)
  let demandPts = 0;
  if (d.currentDemandTpd >= params.netCbgDemandTpd * 2) demandPts += 50;
  else if (d.currentDemandTpd >= params.netCbgDemandTpd) demandPts += 35;
  else if (d.currentDemandTpd >= params.netCbgDemandTpd * 0.5) demandPts += 18;

  if (d.futureDemandTpd >= params.netEstDemand5yTpd * 2) demandPts += 40;
  else if (d.futureDemandTpd >= params.netEstDemand5yTpd) demandPts += 28;
  else if (d.futureDemandTpd >= params.netEstDemand5yTpd * 0.5) demandPts += 12;

  if (d.cngStations >= 20) demandPts += 10;
  else if (d.cngStations >= 5) demandPts += 5;
  demandPts = Math.min(100, demandPts);

  const demand: Pillar = {
    id: "demand",
    label: "Demand",
    level: levelFrom(demandPts),
    headline:
      demandPts >= 75
        ? "Strong offtake outlook"
        : demandPts >= 45
          ? "Moderate demand base"
          : "Thin demand today",
    detail: `Current CBG demand ${fmt(d.currentDemandTpd, 2)} TPD vs threshold ${fmt(params.netCbgDemandTpd, 1)} TPD. 5-year estimate ${fmt(d.futureDemandTpd, 2)} TPD.`,
    metrics: [
      { label: "Current demand", value: `${fmt(d.currentDemandTpd, 2)} TPD` },
      { label: "5Y demand", value: `${fmt(d.futureDemandTpd, 2)} TPD` },
      { label: "CNG stations", value: fmt(d.cngStations, 0) },
      { label: "PNG households", value: fmt(d.pngHh, 0) },
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
    detail: `Net surplus ${fmt(d.netSurplusKtpa, 1)} KTPA (threshold ${fmt(params.netBiomassSurplusKtpa, 0)}). Existing plants use ${fmt(d.feedstockUsedTpd, 1)} TPD feedstock.`,
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
    detail: d.pipelineName
      ? `${d.pipelineName} · ~${fmt(dist, 1)} km · ${fmt(d.pipelineMmscmd, 1)} MMSCMD`
      : "No linked pipeline in the workbook for this district.",
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
    detail: `${totalPlants} registered · ${functional} functional/completed · ${under} under construction · ${yet} yet to start · ~${fmt(totalCap, 1)} TPD capacity.`,
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
      ? "District clears the core feasibility tests for a CBG bet — demand, feedstock and offtake path look aligned."
      : verdict === "Watch"
        ? "Mixed feasibility. Useable with the right plant size / feedstock mix, but one or more pillars need diligence."
        : "Weak case on current thresholds. Better as a pass unless strategy explicitly targets this profile.";

  return { score, verdict, summary, pillars };
}

export function rankDistricts(districts: District[], params: ControlParams, plants: Plant[]) {
  return districts
    .map((d) => ({ d, feasibility: assessDistrict(d, params, plants) }))
    .sort((a, b) => b.feasibility.score - a.feasibility.score);
}
