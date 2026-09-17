import { NavLink, Outlet } from "react-router-dom";
import { useData } from "../lib/DataContext";

const links = [
  { to: "/", label: "District", end: true },
  { to: "/gas", label: "GAs", end: false },
  { to: "/scan", label: "Scan", end: false },
  { to: "/thresholds", label: "Thresholds", end: false },
];

export function Layout() {
  const { data } = useData();
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden>C</div>
          <div>
            <strong>Feasibility Desk</strong>
            <span>{data ? `${data.meta.districtCount} districts · ${data.meta.gaCount} GAs` : "CBG screening"}</span>
          </div>
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
