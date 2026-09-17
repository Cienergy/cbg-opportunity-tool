import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { DataProvider } from "./lib/DataContext";
import { Layout } from "./components/Layout";
import { BestLocationsPage } from "./pages/BestLocationsPage";
import { StatesPage } from "./pages/StatesPage";
import { GasPage } from "./pages/GasPage";
import { MaPage } from "./pages/MaPage";
import { InsightsPage } from "./pages/InsightsPage";
import "./styles/app.css";

export default function App() {
  return (
    <DataProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<BestLocationsPage />} />
            <Route path="states" element={<StatesPage />} />
            <Route path="gas" element={<GasPage />} />
            <Route path="ma" element={<MaPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </DataProvider>
  );
}
