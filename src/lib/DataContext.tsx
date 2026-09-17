import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ControlParams, Dataset } from "./types";

type DataCtx = {
  data: Dataset | null;
  loading: boolean;
  error: string | null;
  params: ControlParams;
  setParams: (p: ControlParams) => void;
  resetParams: () => void;
};

const Ctx = createContext<DataCtx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<ControlParams>({
    netCbgDemandTpd: 3,
    netBiomassSurplusKtpa: 50,
    netEstDemand5yTpd: 10,
    nearestPipelineKm: 3000,
    distanceFromLargeCityKm: 0,
    strawBlendPct: 0,
    industrialBlendPct: 0,
    energyCropBlendPct: 0,
    nearbyGaLimit: 8,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data/dataset.json`);
        if (!res.ok) throw new Error(`Failed to load dataset (${res.status})`);
        const json = (await res.json()) as Dataset;
        if (cancelled) return;
        setData(json);
        setParams({ ...json.controlDefaults, nearbyGaLimit: (json.controlDefaults as {nearbyGaLimit?: number}).nearbyGaLimit ?? 8 });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      data,
      loading,
      error,
      params,
      setParams,
      resetParams: () => data && setParams({ ...data.controlDefaults, nearbyGaLimit: (data.controlDefaults as {nearbyGaLimit?: number}).nearbyGaLimit ?? 8 }),
    }),
    [data, loading, error, params]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData outside provider");
  return ctx;
}
