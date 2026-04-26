import { useState, useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import App from "./App.jsx"
import LoginPage from "./LoginPage.jsx"
import { onAuthChange } from "./firebase.js"

export default function Root() {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    const unsub = onAuthChange((u) => setUser(u))
    return unsub
  }, [])

  if (user === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4faf0", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 28 }}>🎓</div>
        <div style={{ color: "#52a32d", fontSize: 15, fontWeight: 600 }}>Loading GlotClass AI...</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/*" element={user ? <App user={user} /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}