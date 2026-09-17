import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { DataProvider } from "./lib/DataContext";
import { Layout } from "./components/Layout";
import { DistrictPage } from "./pages/DistrictPage";
import { ScanPage } from "./pages/ScanPage";
import { ThresholdsPage } from "./pages/ThresholdsPage";
import "./styles/app.css";

export default function App() {
  return (
    <DataProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DistrictPage />} />
            <Route path="scan" element={<ScanPage />} />
            <Route path="thresholds" element={<ThresholdsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </DataProvider>
  );
}
