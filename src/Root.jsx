import { useState, useEffect } from "react"
import App from "./App.jsx"
import LoginPage from "./LoginPage.jsx"
import ClassroomTeacher from "./ClassroomTeacher.jsx"
import ClassroomStudent from "./ClassroomStudent.jsx"
import { onAuthChange } from "./firebase.js"

export default function Root() {
  const [user, setUser] = useState(undefined)
  const path = window.location.pathname

  useEffect(() => {
    const unsub = onAuthChange((u) => setUser(u))
    return unsub
  }, [])

  // Student page — no auth needed
  if (path === "/student") return <ClassroomStudent />

  // Still loading auth
  if (user === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4faf0", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 28 }}>🎓</div>
        <div style={{ color: "#52a32d", fontSize: 15, fontWeight: 600 }}>Loading GlotClass AI...</div>
      </div>
    )
  }

  // Teacher page — needs auth
  if (path === "/teacher") {
    return user ? <ClassroomTeacher /> : <LoginPage />
  }

  // Login page
  if (path === "/login") {
    return user ? <App user={user} /> : <LoginPage />
  }

  // Main app
  return user ? <App user={user} /> : <LoginPage />
}