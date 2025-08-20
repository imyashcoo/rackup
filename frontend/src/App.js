import React, { useEffect, useMemo, useState, createContext } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import Home from "./pages/Home";
import ListingDetail from "./pages/ListingDetail";

export const AuthContext = createContext({ user: null, setUser: () => {} });
export const AppContext = createContext({ searchText: "", setSearchText: () => {} });

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL ? `${BACKEND_URL}/api` : "/api"; // never hardcode external URL

function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ru_user")) } catch { return null }
  });
  useEffect(()=>{ localStorage.setItem("ru_user", JSON.stringify(user)); }, [user]);

  const [searchText, setSearchText] = useState("");

  // Ping backend Hello World to confirm connection (non-blocking)
  useEffect(() => {
    const hello = async () => {
      try { await axios.get(`${API}/`); } catch { /* ignore */ }
    };
    hello();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BrowserRouter>
        <AuthContext.Provider value={{ user, setUser }}>
          <AppContext.Provider value={{ searchText, setSearchText }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/listing/:id" element={<ListingDetail />} />
              {/* Chat and Post routes will be added next */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppContext.Provider>
        </AuthContext.Provider>
      </BrowserRouter>
    </div>
  );
}

export default App;