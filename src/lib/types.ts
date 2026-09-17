export type ControlParams = {
  netCbgDemandTpd: number;
  netBiomassSurplusKtpa: number;
  netEstDemand5yTpd: number;
  nearestPipelineKm: number;
  distanceFromLargeCityKm: number;
  strawBlendPct: number;
  industrialBlendPct: number;
  energyCropBlendPct: number;
};

export type District = {
  sr: number | null;
  stateCode: string | null;
  state: string | null;
  district: string | null;
  plantCount: number;
  capacityTpd: number;
  functionalCompleted: number;
  underConstruction: number;
  yetToStart: number;
  plants: string[];
  netSurplusKtpa: number;
  grossSurplusKtpa: number;
  wheatSurplus: number;
  riceSurplus: number;
  maizeSurplus: number;
  netTpdCbg: number;
  grossTpdCng: number;
  cngStations: number;
  currentDemandTpd: number;
  pngHh: number;
  est5yCngStations: number;
  futureDemandTpd: number;
  est5yPngHh: number;
  pipelineType: string | null;
  pipelineName: string | null;
  pipelineDistanceKm: number | null;
  pipelineMmscmd: number | null;
  feedstockUsedTpd: number;
  flagDemand: boolean | null;
  flagRawMaterial: boolean | null;
  flagNearestPipeline: boolean | null;
  flagLargeCity: boolean | null;
  flagEstDemand5y: boolean | null;
  govSupport: string | null;
};

export type GA = {
  sr: number | null;
  state: string | null;
  gaId: string | null;
  area: string | null;
  entity: string | null;
  authDate: string | null;
  plantCount: number;
  capacityTpd: number;
  functionalCompleted: number;
  underConstruction: number;
  yetToStart: number;
  plants: string[];
  netSurplusKtpa: number;
  grossSurplusKtpa: number;
  currentDemandTpd: number;
  futureDemandTpd: number;
  cngStations: number;
  pngHh: number;
  pipelineType: string | null;
  pipelineName: string | null;
  pipelineDistanceKm: number | null;
  pipelineMmscmd: number | null;
  feedstockUsedTpd: number;
  flagDemand: boolean | null;
  flagRawMaterial: boolean | null;
  flagNearestPipeline: boolean | null;
  govSupport: string | null;
};

export type Plant = {
  sn: number | null;
  projectId: string | null;
  state: string | null;
  stateCode: string | null;
  district: string | null;
  block: string | null;
  plantName: string | null;
  entityName: string | null;
  status: string | null;
  capacityTpd: number | null;
  feedstockTpd: number | null;
  address: string | null;
  detailUrl: string | null;
  qaFlag: string | null;
};

export type Pipeline = {
  entity: string | null;
  name: string | null;
  regulation: string | null;
  status: string | null;
  authorisedKm: number | null;
  authorisedMmscmd: number | null;
  designMmscmd: number | null;
  operatingKm: number | null;
  underConstructionKm: number | null;
  monthlySuppliedMmscmd: number | null;
  utilisationPct: number | null;
  targetCompletion: string | null;
  states: string | null;
  districts: string | null;
};

export type Dataset = {
  generatedAt: string;
  sourceFile: string;
  controlDefaults: ControlParams;
  assumptions: Record<string, { value: number; note: string | null }>;
  summaryStates: {
    state: string | null;
    plants: number;
    capacityTpd: number;
    demandTpd: number;
    surplusKtpa: number;
  }[];
  districts: District[];
  gas: GA[];
  plants: Plant[];
  pipelines: Pipeline[];
  meta: {
    districtCount: number;
    gaCount: number;
    plantCount: number;
    pipelineCount: number;
    stateCount: number;
  };
};

export function normalizeStateName(name: string | null | undefined): string {
  if (!name) return "";
  const n = name.trim().toLowerCase();
  const aliases: Record<string, string> = {
    "nct of delhi": "delhi",
    "delhi": "delhi",
    "orissa": "odisha",
    "pondicherry": "puducherry",
    "andaman and nicobar": "andaman & nicobar",
    "andaman and nicobar islands": "andaman & nicobar",
    "dadra and nagar haveli": "dadra & nagar haveli and daman & diu",
    "daman and diu": "dadra & nagar haveli and daman & diu",
    "jammu and kashmir": "jammu & kashmir",
    "tamilnadu": "tamil nadu",
  };
  return aliases[n] || n;
}

export function matchesState(a: string | null | undefined, b: string | null | undefined) {
  return normalizeStateName(a) === normalizeStateName(b);
}

export function fmt(n: number | null | undefined, digits = 1) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: digits });
}

export function scoreDistrict(d: District, p: ControlParams) {
  let score = 0;
  const reasons: string[] = [];

  if (d.currentDemandTpd >= p.netCbgDemandTpd) {
    score += 25;
    reasons.push("Demand ≥ threshold");
  }
  if (d.netSurplusKtpa >= p.netBiomassSurplusKtpa) {
    score += 25;
    reasons.push("Biomass surplus ≥ threshold");
  }
  if (
    d.pipelineDistanceKm != null &&
    d.pipelineDistanceKm <= p.nearestPipelineKm
  ) {
    score += 20;
    reasons.push("Pipeline within range");
  } else if (d.flagNearestPipeline) {
    score += 10;
    reasons.push("Pipeline flag");
  }
  if (d.futureDemandTpd >= p.netEstDemand5yTpd) {
    score += 15;
    reasons.push("5Y demand ≥ threshold");
  }
  if (d.plantCount === 0) {
    score += 10;
    reasons.push("No existing plants");
  } else if (d.functionalCompleted === 0 && d.underConstruction > 0) {
    score += 5;
    reasons.push("Only under construction");
  }
  if (d.govSupport && /high|medium/i.test(d.govSupport)) {
    score += 5;
    reasons.push(`Gov support: ${d.govSupport}`);
  }
  return { score, reasons };
}

export function scoreGa(g: GA, p: ControlParams) {
  let score = 0;
  const reasons: string[] = [];
  if (g.currentDemandTpd >= p.netCbgDemandTpd) {
    score += 25;
    reasons.push("Demand ≥ threshold");
  }
  if (g.netSurplusKtpa >= p.netBiomassSurplusKtpa) {
    score += 25;
    reasons.push("Biomass surplus ≥ threshold");
  }
  if (g.flagNearestPipeline || (g.pipelineDistanceKm != null && g.pipelineDistanceKm > 0)) {
    score += 20;
    reasons.push("Pipeline available");
  }
  if (g.futureDemandTpd >= p.netEstDemand5yTpd) {
    score += 15;
    reasons.push("5Y demand ≥ threshold");
  }
  if (g.plantCount === 0) {
    score += 10;
    reasons.push("White space GA");
  }
  return { score, reasons };
}

export type MaParams = ControlParams & {
  minCapacityTpd: number;
  statuses: string[];
  preferLowCompetition: boolean;
};

export function scoreMaPlant(
  plant: Plant,
  district: District | undefined,
  p: MaParams
) {
  if (!plant.status || !p.statuses.includes(plant.status)) {
    return { score: -1, reasons: ["Status filtered out"] };
  }
  const cap = plant.capacityTpd ?? 0;
  if (cap < p.minCapacityTpd) {
    return { score: -1, reasons: ["Below min capacity"] };
  }

  let score = 0;
  const reasons: string[] = [];
  if (plant.status === "Functional") {
    score += 30;
    reasons.push("Functional");
  } else if (plant.status === "Completed") {
    score += 25;
    reasons.push("Completed");
  } else if (plant.status === "Under Construction") {
    score += 15;
    reasons.push("Under construction");
  }

  score += Math.min(25, cap);
  reasons.push(`Capacity ${cap} TPD`);

  if (district) {
    if (district.currentDemandTpd >= p.netCbgDemandTpd) {
      score += 15;
      reasons.push("Strong local demand");
    }
    if (district.netSurplusKtpa >= p.netBiomassSurplusKtpa) {
      score += 15;
      reasons.push("Strong biomass");
    }
    if (district.flagNearestPipeline) {
      score += 10;
      reasons.push("Near pipeline");
    }
    if (p.preferLowCompetition && district.plantCount <= 2) {
      score += 10;
      reasons.push("Low competition");
    }
  }
  return { score, reasons };
}
