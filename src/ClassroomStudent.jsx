import { useState, useEffect } from "react"
import { db, auth, callAPI } from "./firebase"
import { ref, onValue, set } from "firebase/database"

const LANGS = [
  { c: "en", l: "English", flag: "🇬🇧" },
  { c: "hi", l: "Hindi", flag: "🇮🇳" },
  { c: "bn", l: "Bengali", flag: "🇮🇳" },
  { c: "te", l: "Telugu", flag: "🇮🇳" },
  { c: "mr", l: "Marathi", flag: "🇮🇳" },
  { c: "ta", l: "Tamil", flag: "🇮🇳" },
  { c: "gu", l: "Gujarati", flag: "🇮🇳" },
  { c: "kn", l: "Kannada", flag: "🇮🇳" },
  { c: "ml", l: "Malayalam", flag: "🇮🇳" },
  { c: "pa", l: "Punjabi", flag: "🇮🇳" },
  { c: "es", l: "Spanish", flag: "🇪🇸" },
  { c: "fr", l: "French", flag: "🇫🇷" },
  { c: "de", l: "German", flag: "🇩🇪" },
]

export default function ClassroomStudent() {
  const [roomCode, setRoomCode] = useState(() => sessionStorage.getItem("gc_room") || "")
  const [joined, setJoined] = useState(false)
  const [roomData, setRoomData] = useState(null)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("transcript")
  const [fontSize, setFontSize] = useState("14px")
  const [language, setLanguage] = useState("en")
  const [translated, setTranslated] = useState("")
  const [translating, setTranslating] = useState(false)
  

  // Auto-translate when simplified notes update
  useEffect(() => {
  if (!roomData?.simplified || language === "en") return
  const simplified = roomData.simplified
  const lang = LANGS.find(l => l.c === language)
  if (!lang) return

  let cancelled = false

  const doTranslate = async () => {
    try {
      const res = await callAPI("/api/translate", {
        method: "POST",
        body: JSON.stringify({ text: simplified, language: lang.l }),
      })
      const data = await res.json()
      if (!cancelled) {
        setTranslated(data.result || simplified)
        setTranslating(false)
      }
    } catch {
      if (!cancelled) setTranslating(false)
    }
  }

  setTimeout(() => {
    if (!cancelled) setTranslating(true)
    doTranslate()
  }, 0)

  return () => { cancelled = true }
}, [roomData?.simplified, language])

  const joinRoom = async () => {
    const code = roomCode.toUpperCase().trim()
    if (code.length < 4) { setError("Please enter a valid room code"); return }

    sessionStorage.setItem("gc_room", code)

    const roomRef = ref(db, `rooms/${code}`)
    onValue(roomRef, (snap) => {
      if (!snap.exists()) {
        setError("Room not found. Check the code and try again.")
        return
      }
      setRoomData(snap.val())
      setError("")
    })

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
        <div style={{ background: "#fff", borderRadius: 20, padding: "2.5rem", border: "1px solid #c8e6b0", maxWidth: 420, width: "100%", textAlign: "center" }}>
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

          {/* Language chooser */}
          <div style={{ marginBottom: "1rem", textAlign: "left" }}>
            <label style={{ fontSize: 12, color: "#6a9a52", fontWeight: 700, display: "block", marginBottom: 4 }}>
              I want notes in
            </label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #c8e6b0", borderRadius: 8, fontSize: 13, color: "#1a3d0f", background: "#f8fdf4", outline: "none" }}
            >
              {LANGS.map(l => <option key={l.c} value={l.c}>{l.flag} {l.l}</option>)}
            </select>
          </div>

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

  const getContent = () => {
    if (activeTab === "transcript") return transcript
    if (activeTab === "simplified") return simplified
    if (activeTab === "translated") {
      if (language === "en") return simplified
      if (translating) return "⏳ Translating..."
      return translated || "Translation will appear soon..."
    }
    return ""
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4faf0", fontFamily: "sans-serif" }}>

      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "1px solid #c8e6b0", padding: "0.8rem 1.2rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1a3d0f" }}>📚 {teacherName}'s Class</div>
          <div style={{ fontSize: 11, color: "#6a9a52" }}>Room: {roomCode.toUpperCase()}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Language switcher */}
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            style={{ padding: "5px 8px", border: "1.5px solid #c8e6b0", borderRadius: 8, fontSize: 12, color: "#1a3d0f", background: "#f8fdf4", outline: "none" }}
          >
            {LANGS.map(l => <option key={l.c} value={l.c}>{l.flag} {l.l}</option>)}
          </select>
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
          {[
            ["transcript", "📄 Live Notes"],
            ["simplified", "📖 Simplified"],
            ["translated", language === "en" ? "🌐 Translated" : `🌐 ${LANGS.find(l => l.c === language)?.l || "Translated"}`],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{ flex: 1, padding: "8px", border: "none", background: activeTab === key ? "#52a32d" : "transparent", color: activeTab === key ? "#fff" : "#6a9a52", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
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
              {getContent()}
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