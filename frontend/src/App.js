import React, { useEffect, useState, createContext } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import Home from "./pages/Home";
import ListingDetail from "./pages/ListingDetail";
import Chat from "./pages/Chat";
import PostRack from "./pages/PostRack";

export const AuthContext = createContext({ user: null, setUser: () => {} });
export const AppContext = createContext({ searchText: "", setSearchText: () => {} });

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL ? `${BACKEND_URL}/api` : "/api"; // backend URL from env

function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ru_user")) } catch { return null }
  });
  React.useEffect(()=>{ localStorage.setItem("ru_user", JSON.stringify(user)); }, [user]);

  const [searchText, setSearchText] = useState("");

  // Axios defaults + auth header from our app JWT
  useEffect(() => {
    axios.defaults.baseURL = API;
    axios.interceptors.request.use((config)=>{
      const token = localStorage.getItem("ru_token");
      if (token) config.headers = { ...(config.headers||{}), Authorization: `Bearer ${token}` };
      return config;
    });
  }, []);

  // Ping backend Hello World to confirm connection (non-blocking)
  useEffect(() => {
    const hello = async () => {
      try { await axios.get(`/`); } catch { /* ignore */ }
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
              <Route path="/chat/:listingId" element={<Chat />} />
              <Route path="/post" element={<PostRack />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppContext.Provider>
        </AuthContext.Provider>
      </BrowserRouter>
    </div>
  );
}

export default App;