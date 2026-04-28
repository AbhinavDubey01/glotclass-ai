import { useState, useEffect } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import App from "./App.jsx"
import LoginPage from "./LoginPage.jsx"
import ClassroomTeacher from "./ClassroomTeacher.jsx"
import ClassroomStudent from "./ClassroomStudent.jsx"
import { onAuthChange } from "./firebase.js"

function Loading() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4faf0", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 28 }}>🎓</div>
      <div style={{ color: "#52a32d", fontSize: 15, fontWeight: 600 }}>Loading GlotClass AI...</div>
    </div>
  )
}

function AppRoutes() {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    const unsub = onAuthChange((u) => setUser(u))
    return unsub
  }, [])

  if (user === undefined) return <Loading />

  const path = window.location.pathname

  if (path === "/student") return <ClassroomStudent />
  if (path === "/teacher") return user ? <ClassroomTeacher /> : <LoginPage />
  if (path === "/login") return user ? <App user={user} /> : <LoginPage />

  return user ? <App user={user} /> : <LoginPage />
}

export default function Root() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}