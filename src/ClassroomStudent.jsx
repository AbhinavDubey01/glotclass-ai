import { useState } from "react"
import { db } from "./firebase"
import { ref, onValue, set } from "firebase/database"
import { auth } from "./firebase"

export default function ClassroomStudent() {
  const [roomCode, setRoomCode] = useState("")
  const [joined, setJoined] = useState(false)
  const [roomData, setRoomData] = useState(null)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("transcript")
  const [fontSize, setFontSize] = useState("14px")

  const joinRoom = async () => {
    const code = roomCode.toUpperCase().trim()
    if (code.length < 4) { setError("Please enter a valid room code"); return }

    const roomRef = ref(db, `rooms/${code}`)
    onValue(roomRef, (snap) => {
      if (!snap.exists()) {
        setError("Room not found. Check the code and try again.")
        return
      }
      setRoomData(snap.val())
      setError("")
    })

    // Register as student
    const uid = auth.currentUser?.uid || "guest_" + Date.now()
    await set(ref(db, `rooms/${code}/students/${uid}`), {
      name: auth.currentUser?.displayName || "Student",
      joinedAt: Date.now(),
    })

    setJoined(true)
  }

  if (!joined) {
    return (
      <div style={{ minHeight: "100vh", background: "#f4faf0", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", fontFamily: "sans-serif" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "2.5rem", border: "1px solid #c8e6b0", maxWidth: 400, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎓</div>
          <h2 style={{ color: "#1a3d0f", fontFamily: "serif", fontWeight: 400, marginBottom: 6 }}>Join a Classroom</h2>
          <p style={{ color: "#6a9a52", fontSize: 13, marginBottom: "1.5rem" }}>Enter the room code from your teacher</p>

          <input
            value={roomCode}
            onChange={e => setRoomCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && joinRoom()}
            placeholder="e.g. ABC123"
            maxLength={6}
            style={{ width: "100%", padding: "14px", border: "2px solid #c8e6b0", borderRadius: 10, fontSize: "1.5rem", fontWeight: 700, textAlign: "center", letterSpacing: "0.2em", fontFamily: "monospace", color: "#1a3d0f", background: "#f8fdf4", outline: "none", boxSizing: "border-box", marginBottom: "0.8rem" }}
          />

          {error && (
            <div style={{ background: "#fff5f5", border: "1px solid #fcc", color: "#c00", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: "0.8rem" }}>
              {error}
            </div>
          )}

          <button onClick={joinRoom} style={{ width: "100%", background: "#52a32d", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            Join Class →
          </button>

          <div style={{ marginTop: "1rem" }}>
            <a href="/" style={{ color: "#6a9a52", fontSize: 12, textDecoration: "none" }}>← Back to app</a>
          </div>
        </div>
      </div>
    )
  }

  const isLive = roomData?.isLive
  const transcript = roomData?.transcript || ""
  const simplified = roomData?.simplified || ""
  const teacherName = roomData?.teacherName || "Teacher"

  return (
    <div style={{ minHeight: "100vh", background: "#f4faf0", fontFamily: "sans-serif" }}>

      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "1px solid #c8e6b0", padding: "0.8rem 1.2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1a3d0f" }}>📚 {teacherName}'s Class</div>
          <div style={{ fontSize: 11, color: "#6a9a52" }}>Room: {roomCode.toUpperCase()}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isLive ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#dff0d4", borderRadius: 20, padding: "4px 10px" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#52a32d", animation: "pulse 1s infinite" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#3d8120" }}>LIVE</span>
            </div>
          ) : (
            <div style={{ background: "#f0f0f0", borderRadius: 20, padding: "4px 10px", fontSize: 11, color: "#999" }}>
              ⏸ Paused
            </div>
          )}
        </div>
      </header>

      <div style={{ padding: "1rem 1.2rem", maxWidth: 700, margin: "0 auto" }}>

        {/* Font size */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 5, marginBottom: "0.8rem" }}>
          {["12px", "14px", "16px", "18px"].map((f) => (
            <button key={f} onClick={() => setFontSize(f)} style={{ width: 28, height: 28, border: `1.5px solid ${fontSize === f ? "#52a32d" : "#c8e6b0"}`, borderRadius: 6, background: fontSize === f ? "#dff0d4" : "transparent", color: fontSize === f ? "#3d8120" : "#6a9a52", cursor: "pointer", fontWeight: 700, fontSize: f }}>
              A
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 5, marginBottom: "1rem", background: "#e8f5e0", borderRadius: 10, padding: 4 }}>
          {[["transcript", "📄 Live Notes"], ["simplified", "📖 Simplified"], ["translated", "🌐 Translated"]].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{ flex: 1, padding: "8px", border: "none", background: activeTab === key ? "#52a32d" : "transparent", color: activeTab === key ? "#fff" : "#6a9a52", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "1.2rem", border: "1px solid #c8e6b0", minHeight: 300 }}>
          {!transcript && !simplified ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#6a9a52" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>⏳</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Waiting for teacher to start...</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Notes will appear here automatically</div>
            </div>
          ) : (
            <div style={{ fontSize, lineHeight: 1.8, color: "#1a3d0f", whiteSpace: "pre-wrap" }}>
              {activeTab === "transcript" ? transcript : 
                activeTab === "simplified" ? (simplified || "Simplified notes will appear soon...") :
                (roomData?.translated || "Translation will appear soon...")}
            </div>
          )}
        </div>

      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}