import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { matchesState } from "../lib/types";

type Props = {
  selectedState: string | null;
  onSelectState: (state: string | null) => void;
  metricByState?: Record<string, number>;
  height?: number;
};

function FlyTo({ feature }: { feature: Feature<Geometry> | null }) {
  const map = useMap();
  useEffect(() => {
    if (!feature) {
      map.setView([22.5, 82], 4.6);
      return;
    }
    const layer = L.geoJSON(feature);
    const b = layer.getBounds();
    if (b.isValid()) map.fitBounds(b.pad(0.1));
  }, [feature, map]);
  return null;
}

export function IndiaMap({ selectedState, onSelectState, metricByState = {}, height = 280 }: Props) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/india-states.geojson`)
      .then((r) => r.json())
      .then(setGeo)
      .catch(console.error);
  }, []);

  const max = useMemo(() => Math.max(1, ...Object.values(metricByState), 1), [metricByState]);
  const selectedFeature = useMemo(() => {
    if (!geo || !selectedState) return null;
    return geo.features.find((f) => matchesState(String(f.properties?.NAME_1 || ""), selectedState)) || null;
  }, [geo, selectedState]);

  const style = (feature?: Feature) => {
    const name = String(feature?.properties?.NAME_1 || "");
    const key = Object.keys(metricByState).find((k) => matchesState(k, name));
    const v = key ? metricByState[key] : 0;
    const t = v / max;
    const selected = selectedState && matchesState(selectedState, name);
    return {
      fillColor: selected ? "#c4a574" : `rgba(63, 168, 122, ${0.08 + t * 0.55})`,
      weight: selected ? 1.8 : 0.8,
      color: selected ? "#e8d5b0" : "rgba(232,236,233,0.18)",
      fillOpacity: 0.95,
    };
  };

  return (
    <div className="map-wrap" style={{ height }}>
      <MapContainer center={[22.5, 82]} zoom={4.6} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OSM'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <FlyTo feature={selectedFeature} />
        {geo && (
          <GeoJSON
            key={selectedState || "all"}
            data={geo}
            style={style as L.StyleFunction}
            onEachFeature={(feature, layer) => {
              const name = String(feature.properties?.NAME_1 || "");
              layer.bindTooltip(name);
              layer.on({ click: () => onSelectState(name) });
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
