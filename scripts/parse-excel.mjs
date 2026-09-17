import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const xlsxPath = path.join(root, "data", "CBG Analysis with Summary 3Y. incl.xlsx");
const outDir = path.join(root, "public", "data");

const STATE_ABBR = {
  AN: "Andaman & Nicobar",
  AP: "Andhra Pradesh",
  AR: "Arunachal Pradesh",
  AS: "Assam",
  BR: "Bihar",
  CH: "Chandigarh",
  CG: "Chhattisgarh",
  DN: "Dadra & Nagar Haveli and Daman & Diu",
  DD: "Dadra & Nagar Haveli and Daman & Diu",
  DL: "Delhi",
  GA: "Goa",
  GJ: "Gujarat",
  HR: "Haryana",
  HP: "Himachal Pradesh",
  JK: "Jammu & Kashmir",
  JH: "Jharkhand",
  KA: "Karnataka",
  KL: "Kerala",
  LA: "Ladakh",
  LD: "Lakshadweep",
  MP: "Madhya Pradesh",
  MH: "Maharashtra",
  MN: "Manipur",
  ML: "Meghalaya",
  MZ: "Mizoram",
  NL: "Nagaland",
  OR: "Odisha",
  OD: "Odisha",
  PY: "Puducherry",
  PB: "Punjab",
  RJ: "Rajasthan",
  SK: "Sikkim",
  TN: "Tamil Nadu",
  TS: "Telangana",
  TE: "Telangana",
  TR: "Tripura",
  UP: "Uttar Pradesh",
  UK: "Uttarakhand",
  UT: "Uttarakhand",
  WB: "West Bengal",
};

const yn = (v) => {
  if (v == null || v === "") return null;
  const s = String(v).trim().toUpperCase();
  if (s === "Y" || s === "YES" || s === "TRUE") return true;
  if (s === "N" || s === "NO" || s === "FALSE") return false;
  return null;
};

const num = (v) => {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

const str = (v) => (v == null ? null : String(v).trim() || null);

function expandState(codeOrName) {
  if (!codeOrName) return null;
  const s = String(codeOrName).trim();
  if (STATE_ABBR[s.toUpperCase()]) return STATE_ABBR[s.toUpperCase()];
  return s;
}

function sheetRows(wb, name) {
  return XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null, raw: true });
}

function parseControl(rows) {
  const pick = (label) => {
    const row = rows.find((r) => r?.[0] === label);
    return row ? num(row[2] ?? row[3]) : null;
  };
  return {
    netCbgDemandTpd: pick("Net CBG Demand") ?? 3,
    netBiomassSurplusKtpa: pick("Net Biomass Surplus") ?? 50,
    netEstDemand5yTpd: pick("Net Est Demand 5Y") ?? 10,
    nearestPipelineKm: pick("Nearest Pipeline") ?? 3000,
    distanceFromLargeCityKm: pick("Distance from large city") ?? 0,
    strawBlendPct: pick("Straws (PS, CT, MS)") ?? 0,
    industrialBlendPct: pick("Industrials (PM, OFMSW, TS)") ?? 0,
    energyCropBlendPct: pick("Energy Crops") ?? 0,
  };
}

function parseAssumptions(rows) {
  const out = {};
  for (const r of rows) {
    if (!r?.[0] || r[0] === "Parameter") continue;
    if (typeof r[1] === "number") out[String(r[0])] = { value: r[1], note: r[2] ?? null };
  }
  return out;
}

function parseSummaryStates(rows) {
  const start = rows.findIndex((r) => r?.[0] === "State" && String(r?.[1] || "").includes("CBG"));
  const states = [];
  for (let i = start + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r?.[0] || String(r[0]).startsWith("Source:")) break;
    states.push({
      state: str(r[0]),
      plants: num(r[1]) ?? 0,
      capacityTpd: num(r[2]) ?? 0,
      demandTpd: num(r[3]) ?? 0,
      surplusKtpa: num(r[4]) ?? 0,
    });
  }
  return states;
}

function parseDistricts(rows) {
  // row index 1 is header
  const out = [];
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    if (!r?.[2]) continue;
    const stateCode = str(r[1]);
    out.push({
      sr: num(r[0]),
      stateCode,
      state: expandState(stateCode),
      district: str(r[2]),
      plantCount: num(r[3]) ?? 0,
      capacityTpd: num(r[4]) ?? 0,
      functionalCompleted: num(r[5]) ?? 0,
      underConstruction: num(r[6]) ?? 0,
      yetToStart: num(r[7]) ?? 0,
      plants: [str(r[8]), str(r[9]), str(r[10])].filter(Boolean),
      netSurplusKtpa: num(r[11]) ?? 0,
      grossSurplusKtpa: num(r[12]) ?? 0,
      wheatSurplus: num(r[13]) ?? 0,
      riceSurplus: num(r[14]) ?? 0,
      maizeSurplus: num(r[15]) ?? 0,
      netTpdCbg: num(r[16]) ?? 0,
      grossTpdCng: num(r[17]) ?? 0,
      cngStations: num(r[18]) ?? 0,
      currentDemandTpd: num(r[19]) ?? 0,
      pngHh: num(r[20]) ?? 0,
      est5yCngStations: num(r[21]) ?? 0,
      futureDemandTpd: num(r[22]) ?? 0,
      est5yPngHh: num(r[23]) ?? 0,
      pipelineType: str(r[24]),
      pipelineName: str(r[25]),
      pipelineDistanceKm: num(r[26]),
      pipelineMmscmd: num(r[27]),
      feedstockUsedTpd: num(r[28]) ?? 0,
      flagDemand: yn(r[29]),
      flagRawMaterial: yn(r[30]),
      flagNearestPipeline: yn(r[31]),
      flagLargeCity: yn(r[32]),
      flagEstDemand5y: yn(r[33]),
      govSupport: str(r[35]),
    });
  }
  return out;
}

function parseGas(rows) {
  const out = [];
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    if (!r?.[3] && !r?.[4]) continue;
    const stateRaw = str(r[2]);
    out.push({
      sr: num(r[1]),
      state: expandState(stateRaw) || stateRaw,
      gaId: str(r[3]),
      area: str(r[4]),
      entity: str(r[5]),
      authDate: str(r[6]),
      plantCount: num(r[7]) ?? 0,
      capacityTpd: num(r[8]) ?? 0,
      functionalCompleted: num(r[9]) ?? 0,
      underConstruction: num(r[10]) ?? 0,
      yetToStart: num(r[11]) ?? 0,
      plants: [str(r[12]), str(r[13]), str(r[14])].filter(Boolean),
      netSurplusKtpa: num(r[15]) ?? 0,
      grossSurplusKtpa: num(r[16]) ?? 0,
      wheatSurplus: num(r[17]) ?? 0,
      riceSurplus: num(r[18]) ?? 0,
      maizeSurplus: num(r[19]) ?? 0,
      netTpdCbg: num(r[20]) ?? 0,
      grossTpdCng: num(r[21]) ?? 0,
      cngStations: num(r[22]) ?? 0,
      currentDemandTpd: num(r[23]) ?? 0,
      pngHh: num(r[24]) ?? 0,
      est5yCngStations: num(r[25]) ?? 0,
      futureDemandTpd: num(r[26]) ?? 0,
      est5yPngHh: num(r[27]) ?? 0,
      pipelineType: str(r[28]),
      pipelineName: str(r[29]),
      pipelineDistanceKm: num(r[30]),
      pipelineMmscmd: num(r[31]),
      feedstockUsedTpd: num(r[32]) ?? 0,
      flagDemand: yn(r[33]),
      flagRawMaterial: yn(r[34]),
      flagNearestPipeline: yn(r[35]),
      govSupport: str(r[40]),
    });
  }
  return out;
}

function parsePlants(rows) {
  const header = rows[0];
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const g = (r, key) => r[idx[key]];
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!g(r, "project_id")) continue;
    out.push({
      sn: num(g(r, "sn")),
      projectId: str(g(r, "project_id")),
      state: str(g(r, "state_name")),
      stateCode: str(g(r, "state_code")),
      district: str(g(r, "district_name")),
      block: str(g(r, "block_name")),
      plantName: str(g(r, "project_name")),
      entityName: str(g(r, "entity_name")),
      status: str(g(r, "status_label")),
      capacityTpd: num(g(r, "capacity_tpd_verified")) ?? num(g(r, "gas_production_capacity")),
      feedstockTpd: num(g(r, "solid_feedstock_capacity")),
      address: str(g(r, "street_area_address")),
      detailUrl: str(g(r, "detail_url")),
      qaFlag: str(g(r, "capacity_qa_flag")),
    });
  }
  return out;
}

function parsePipelines(rows) {
  const header = rows[3];
  const out = [];
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    if (!r?.[1]) continue;
    out.push({
      entity: str(r[0]),
      name: str(r[1]),
      regulation: str(r[2]),
      status: str(r[3]),
      authorisedKm: num(r[4]),
      authorisedMmscmd: num(r[5]),
      designMmscmd: num(r[6]),
      operatingKm: num(r[7]),
      underConstructionKm: num(r[8]),
      monthlySuppliedMmscmd: num(r[9]),
      utilisationPct: num(r[10]),
      targetCompletion: str(r[11]),
      states: str(r[12]),
      districts: str(r[13]),
    });
  }
  return out;
}

const wb = XLSX.readFile(xlsxPath, { cellDates: true });
fs.mkdirSync(outDir, { recursive: true });

const control = parseControl(sheetRows(wb, "Control"));
const assumptions = parseAssumptions(sheetRows(wb, "Assumptions"));
const summaryStates = parseSummaryStates(sheetRows(wb, "Summary"));
const districts = parseDistricts(sheetRows(wb, "All States (2)"));
const gas = parseGas(sheetRows(wb, "GAs"));
const plants = parsePlants(sheetRows(wb, "CBG Plants"));
const pipelines = parsePipelines(sheetRows(wb, "Pipeline Data"));

const payload = {
  generatedAt: new Date().toISOString(),
  sourceFile: "CBG Analysis with Summary 3Y. incl.xlsx",
  controlDefaults: control,
  assumptions,
  summaryStates,
  districts,
  gas,
  plants,
  pipelines,
  meta: {
    districtCount: districts.length,
    gaCount: gas.length,
    plantCount: plants.length,
    pipelineCount: pipelines.length,
    stateCount: new Set(districts.map((d) => d.state).filter(Boolean)).size,
  },
};

fs.writeFileSync(path.join(outDir, "dataset.json"), JSON.stringify(payload));
console.log("Wrote public/data/dataset.json", payload.meta);
console.log("Size MB", (fs.statSync(path.join(outDir, "dataset.json")).size / 1e6).toFixed(2));
