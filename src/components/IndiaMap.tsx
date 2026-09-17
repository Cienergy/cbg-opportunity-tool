import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { matchesState } from "../lib/types";

type Props = {
  selectedState: string | null;
  onSelectState: (state: string | null) => void;
  metricByState: Record<string, number>;
  metricLabel?: string;
};

function FitIndia() {
  const map = useMap();
  useEffect(() => {
    map.setView([22.5, 82], 4.5);
  }, [map]);
  return null;
}

function FlyTo({ feature }: { feature: Feature<Geometry> | null }) {
  const map = useMap();
  useEffect(() => {
    if (!feature) return;
    const layer = L.geoJSON(feature);
    const b = layer.getBounds();
    if (b.isValid()) map.fitBounds(b.pad(0.08));
  }, [feature, map]);
  return null;
}

export function IndiaMap({ selectedState, onSelectState, metricByState, metricLabel = "score" }: Props) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/india-states.geojson`)
      .then((r) => r.json())
      .then(setGeo)
      .catch(console.error);
  }, []);

  const max = useMemo(() => Math.max(1, ...Object.values(metricByState)), [metricByState]);

  const selectedFeature = useMemo(() => {
    if (!geo || !selectedState) return null;
    return (
      geo.features.find((f) =>
        matchesState(String(f.properties?.NAME_1 || ""), selectedState)
      ) || null
    );
  }, [geo, selectedState]);

  const style = (feature?: Feature) => {
    const name = String(feature?.properties?.NAME_1 || "");
    const key = Object.keys(metricByState).find((k) => matchesState(k, name));
    const v = key ? metricByState[key] : 0;
    const t = v / max;
    const selected = selectedState && matchesState(selectedState, name);
    return {
      fillColor: selected
        ? "#c45c26"
        : `rgba(31, 107, 74, ${0.15 + t * 0.75})`,
      weight: selected ? 2.5 : 1,
      color: selected ? "#7a3412" : "#6f7d6f",
      fillOpacity: 0.9,
    };
  };

  return (
    <div className="map-wrap">
      <MapContainer center={[22.5, 82]} zoom={5} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FitIndia />
        <FlyTo feature={selectedFeature} />
        {geo && (
          <GeoJSON
            key={selectedState || "all"}
            data={geo}
            style={style as L.StyleFunction}
            onEachFeature={(feature, layer) => {
              const name = String(feature.properties?.NAME_1 || "");
              const key = Object.keys(metricByState).find((k) => matchesState(k, name));
              const v = key ? metricByState[key] : 0;
              layer.bindTooltip(`${name}<br/>${metricLabel}: ${v.toFixed?.(1) ?? v}`);
              layer.on({
                click: () => onSelectState(name),
              });
            }}
          />
        )}
      </MapContainer>
      {!geo && <div className="loading">Loading map…</div>}
    </div>
  );
}
