import { NavLink, Outlet } from "react-router-dom";
import { useData } from "../lib/DataContext";

const links = [
  { to: "/", label: "District feasibility", end: true },
  { to: "/scan", label: "Scan opportunities" },
  { to: "/thresholds", label: "Thresholds" },
];

export function Layout() {
  const { data } = useData();
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <strong>CBG Feasibility Desk</strong>
          <span>
            Investor / BD view · district-level demand · biomass · pipeline · competition
            {data ? ` · ${data.meta.districtCount} districts` : ""}
          </span>
        </div>
        <nav className="nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
