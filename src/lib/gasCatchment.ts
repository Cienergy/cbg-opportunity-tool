import type { District, GA } from "./types";
import { matchesState } from "./types";
import { normDistrict } from "./feasibility";

export type GaLink = {
  ga: GA;
  role: "home" | "nearby";
  matchedOn: string;
};

export type GasCatchment = {
  home: GaLink[];
  nearby: GaLink[];
  districtDemandNow: number;
  districtDemand5y: number;
  homeDemandNow: number;
  homeDemand5y: number;
  nearbyDemandNow: number;
  nearbyDemand5y: number;
  /** Policy view: home GA(s) + nearby GAs (deduped). Falls back to district if no home GA. */
  addressableNow: number;
  addressable5y: number;
  growthMultiple: number;
  cagrPct: number;
  cngNow: number;
  cng5y: number;
  pngNow: number;
  png5y: number;
};

function cleanArea(area: string) {
  return normDistrict(
    area
      .replace(/\r?\n/g, " ")
      .replace(/\b(districts?|eaaa|city|area|and|&)\b/gi, " ")
  );
}

/** Does a GA area string cover this district name? */
export function gaCoversDistrict(area: string | null | undefined, district: string | null | undefined) {
  if (!area || !district) return false;
  const a = cleanArea(area);
  const d = normDistrict(district);
  if (!a || !d) return false;
  if (a.includes(d) || d.includes(a)) return true;
  // token overlap for multi-name GAs e.g. "Gandhinagar Mehsana Sabarkantha"
  const dTokens = d.split(" ").filter((t) => t.length > 3);
  const aTokens = new Set(a.split(" ").filter((t) => t.length > 3));
  return dTokens.some((t) => aTokens.has(t));
}

function sameStateGa(ga: GA, state: string | null | undefined) {
  if (!state) return false;
  // GA state can be "Kerala & Puducherry" etc.
  const raw = (ga.state || "").replace(/\r?\n/g, " ");
  if (matchesState(raw, state)) return true;
  return raw.toLowerCase().includes((state || "").toLowerCase().split(" ")[0]);
}

export function buildGasCatchment(
  district: District,
  allGas: GA[],
  nearbyDistricts: District[],
  nearbyGaLimit = 8
): GasCatchment {
  const home: GaLink[] = [];
  const seen = new Set<string>();

  for (const ga of allGas) {
    if (!sameStateGa(ga, district.state) && !gaCoversDistrict(ga.area, district.district)) continue;
    if (gaCoversDistrict(ga.area, district.district)) {
      const id = ga.gaId || ga.area || "";
      if (seen.has(id)) continue;
      seen.add(id);
      home.push({ ga, role: "home", matchedOn: district.district || "" });
    }
  }

  const nearbyNames = nearbyDistricts.map((d) => d.district).filter(Boolean) as string[];
  const nearby: GaLink[] = [];
  for (const name of nearbyNames) {
    for (const ga of allGas) {
      if (!sameStateGa(ga, district.state)) continue;
      if (!gaCoversDistrict(ga.area, name)) continue;
      const id = ga.gaId || ga.area || "";
      if (seen.has(id)) continue;
      seen.add(id);
      nearby.push({ ga, role: "nearby", matchedOn: name });
      if (nearby.length >= nearbyGaLimit) break;
    }
    if (nearby.length >= nearbyGaLimit) break;
  }

  const sum = (rows: GaLink[], key: "currentDemandTpd" | "futureDemandTpd") =>
    rows.reduce((s, r) => s + (r.ga[key] || 0), 0);

  const districtDemandNow = district.currentDemandTpd || 0;
  const districtDemand5y = district.futureDemandTpd || 0;
  const homeDemandNow = sum(home, "currentDemandTpd");
  const homeDemand5y = sum(home, "futureDemandTpd");
  const nearbyDemandNow = sum(nearby, "currentDemandTpd");
  const nearbyDemand5y = sum(nearby, "futureDemandTpd");

  const baseNow = home.length ? homeDemandNow : districtDemandNow;
  const base5y = home.length ? homeDemand5y : districtDemand5y;
  const addressableNow = baseNow + nearbyDemandNow;
  const addressable5y = base5y + nearbyDemand5y;

  const growthMultiple = addressableNow > 0 ? addressable5y / addressableNow : addressable5y > 0 ? Infinity : 1;
  const cagrPct =
    addressableNow > 0 && addressable5y > 0
      ? (Math.pow(addressable5y / addressableNow, 1 / 5) - 1) * 100
      : 0;

  const cngNow = district.cngStations || 0;
  const cng5y = district.est5yCngStations || 0;
  const pngNow = district.pngHh || 0;
  const png5y = district.est5yPngHh || 0;

  return {
    home,
    nearby,
    districtDemandNow,
    districtDemand5y,
    homeDemandNow,
    homeDemand5y,
    nearbyDemandNow,
    nearbyDemand5y,
    addressableNow,
    addressable5y,
    growthMultiple: Number.isFinite(growthMultiple) ? growthMultiple : 0,
    cagrPct,
    cngNow,
    cng5y,
    pngNow,
    png5y,
  };
}
