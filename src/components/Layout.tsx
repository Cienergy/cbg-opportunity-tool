import { NavLink, Outlet } from "react-router-dom";
import { useData } from "../lib/DataContext";

const links = [
  { to: "/", label: "Best locations" },
  { to: "/states", label: "States & districts" },
  { to: "/gas", label: "GAs" },
  { to: "/ma", label: "M&A options" },
  { to: "/insights", label: "Insights" },
];

export function Layout() {
  const { data } = useData();
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <strong>CBG Opportunity Desk</strong>
          <span>
            Internal · {data ? `${data.meta.districtCount} districts · ${data.meta.gaCount} GAs · ${data.meta.plantCount} plants` : "loading…"}
          </span>
        </div>
        <nav className="nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
