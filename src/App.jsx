import { logout, callAPI } from "./firebase"
import { useState, useEffect, useRef } from "react"
import jsPDF from "jspdf"
import YoutubeInput from "./YoutubeInput"



async function fetchYoutubeTranscript(videoId) {
  const res = await callAPI(`/api/transcript?videoId=${videoId}`)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error)
  return data.transcript
}

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
  { c: "ar", l: "Arabic", flag: "🇸🇦" },
  { c: "zh", l: "Chinese", flag: "🇨🇳" },
  { c: "ja", l: "Japanese", flag: "🇯🇵" },
  { c: "pt", l: "Portuguese", flag: "🇧🇷" },
  { c: "ru", l: "Russian", flag: "🇷🇺" },
  { c: "ko", l: "Korean", flag: "🇰🇷" },
]

const LEVELS = ["simple", "medium", "advanced"]
const FSZ = [
  { id: "sm", l: "S", px: "12px" },
  { id: "md", l: "M", px: "14px" },
  { id: "lg", l: "L", px: "16px" },
  { id: "xl", l: "XL", px: "18px" },
]

export default function App({ user }) {
  const [tab, setTab] = useState("tr")
  const [inputMode, setInputMode] = useState("audio")
  const [language, setLanguage] = useState("en")
  const [level, setLevel] = useState("medium")
  const [fsz, setFsz] = useState("md")
  const [theme, setTheme] = useState("light")
  const [fileName, setFileName] = useState(null)
  const [audioFile, setAudioFile] = useState(null)
  const [transcript, setTranscript] = useState("")
  const [simplified, setSimplified] = useState("")
  const [translated, setTranslated] = useState("")
  const [tvView, setTvView] = useState("o")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  
  const [wordCount, setWordCount] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Quiz
  const [quiz, setQuiz] = useState([])
  const [quizLoading, setQuizLoading] = useState(false)
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState(0)
  

  // Chat
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", content: "Hi! I'm your GlotClass AI assistant 🌿 Transcribe a YouTube video or upload audio, then ask me anything about the content!" }
  ])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)

// Mobile detection
const [isMobile, setIsMobile] = useState(window.innerWidth < 640)

useEffect(() => {
  const handler = () => setIsMobile(window.innerWidth < 640)
  window.addEventListener("resize", handler)
  return () => window.removeEventListener("resize", handler)
}, [])

// Timer
useEffect(() => {
  const t = setInterval(() => setSeconds(s => s + 1), 1000)
  return () => clearInterval(t)
}, [])

useEffect(() => {
  chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
}, [chatMessages])

  const fmt = (s) => {
    const m = Math.floor(s / 60), sc = s % 60
    return `${String(m).padStart(2, "0")}:${String(sc).padStart(2, "0")}`
  }

  const themeVars = {
    light: { "--bg": "#f4faf0", "--bgc": "#fff", "--bgi": "#f8fdf4", "--bdr": "#c8e6b0", "--tx": "#1a3d0f", "--tx2": "#3d6b28", "--tx3": "#6a9a52", "--ac": "#52a32d", "--ac2": "#3d8120", "--acl": "#dff0d4" },
    dark: { "--bg": "#0d1f09", "--bgc": "#132909", "--bgi": "#1a3510", "--bdr": "#2a4e1c", "--tx": "#d4f0bc", "--tx2": "#90c668", "--tx3": "#578040", "--ac": "#6ab83c", "--ac2": "#90c668", "--acl": "#1a3510" },
    dy: { "--bg": "#fdf8e8", "--bgc": "#fffdf5", "--bgi": "#fffef8", "--bdr": "#d4c87a", "--tx": "#1a1200", "--tx2": "#3d3000", "--tx3": "#7a6000", "--ac": "#8a7000", "--ac2": "#6a5000", "--acl": "#f5edd0" },
  }

  const tv = themeVars[theme] || themeVars.light
  const fszPx = FSZ.find(f => f.id === fsz)?.px || "14px"

  const resetResults = () => {
    setTranscript(""); setSimplified(""); setTranslated("")
    setQuiz([]); setSelectedAnswers({}); setQuizSubmitted(false)
    setTvView("o"); setWordCount(0)
    setChatMessages([{ role: "assistant", content: "Hi! I'm your GlotClass AI assistant 🌿 Ask me anything about the transcribed content!" }])
    setError("")
  }

  const processTranscript = async (rawText) => {
  setTranscript(rawText)
  setWordCount(rawText.split(/\s+/).filter(Boolean).length)
  setTvView("o")
  setTab("tr")

  // Show transcript immediately
  setSimplified("")
  setTranslated("")

  // Simplify
  try {
    const simplifyRes = await callAPI(`/api/simplify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: rawText, level }),
    })
    const simplifyData = await simplifyRes.json()
    const simplifiedText = simplifyData.result || rawText
    setSimplified(simplifiedText)
    setTvView("s") // Auto switch to simplified when ready

    // Translate in background — don't block UI
    const lang = LANGS.find(l => l.c === language)
    try {
  const translateRes = await callAPI(`/api/translate`, {
    method: "POST",
    body: JSON.stringify({ text: simplifiedText, language: lang?.l || "English" }),
  })
  const translateData = await translateRes.json()
  setTranslated(translateData.result || "")
} catch (_e) { console.log(_e) }

  } catch {
    setError("Processing failed. Please try again.")
  }
}

  const handleAudioTranscribe = async () => {
    if (!audioFile) { setError("Please upload an audio file first!"); return }
    resetResults(); setLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", audioFile)
      const res = await callAPI(`/api/transcribe`, { method: "POST", body: formData })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      await processTranscript(data.transcript)
    } catch {
      setError("Transcription failed. Please try again.")
    } finally { setLoading(false) }
  }

  const handleYoutubeTranscript = async (videoId) => {
  resetResults()
  setLoading(true)
  setError("Fetching YouTube transcript...")
  try {
    const rawText = await fetchYoutubeTranscript(videoId)
    setError("")
    await processTranscript(rawText)
  } catch (e) { setError(e.message) }
  finally { setLoading(false) }
}

  const handleGenerateQuiz = async () => {
    if (!simplified) return
    setQuizLoading(true); setQuiz([]); setSelectedAnswers({})
    setQuizSubmitted(false);  setTab("qz")
    try {
      const res = await callAPI(`/api/quiz`, {
  method: "POST",
  body: JSON.stringify({ text: simplified }),
})
const data = await res.json()
      
      setQuiz(data.quiz || [])
    } catch { setError("Could not generate quiz.") }
    finally { setQuizLoading(false) }
  }

  const handleSubmitQuiz = () => {
    let score = 0
    quiz.forEach((q, i) => { if (selectedAnswers[i] === q.answer) score++ })
    setQuizScore(score); setQuizSubmitted(true)
  }

  const handleChatSend = async () => {
    if (!chatInput.trim()) return
    const userMsg = { role: "user", content: chatInput }
    const newMessages = [...chatMessages, userMsg]
    setChatMessages(newMessages); setChatInput(""); setChatLoading(true)
    try {
      const res = await callAPI(`/api/chat`, {
  method: "POST",
  body: JSON.stringify({ messages: newMessages, context: simplified || transcript }),
})
const data = await res.json()
      setChatMessages([...newMessages, { role: "assistant", content: data.result || "Sorry, something went wrong!" }])
    } catch {
      setChatMessages([...newMessages, { role: "assistant", content: "Sorry, something went wrong!" }])
    } finally { setChatLoading(false) }
  }

  const handleCopy = () => {
    const text = tvView === "o" ? transcript : simplified
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadPDF = () => {
    const text = tvView === "o" ? transcript : simplified
    if (!text) return
    const doc = new jsPDF()
    doc.setFontSize(18); doc.setTextColor(30, 64, 175)
    doc.text("GlotClass AI", 14, 20)
    doc.setFontSize(12); doc.setTextColor(100, 116, 139)
    doc.text(tvView === "o" ? "Raw Transcript" : "Simplified Notes", 14, 30)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 38)
    doc.setDrawColor(200, 200, 200); doc.line(14, 42, 196, 42)
    doc.setFontSize(11); doc.setTextColor(30, 30, 30)
    const lines = doc.splitTextToSize(text, 180)
    doc.text(lines, 14, 52)
    doc.save(`glotclass-${Date.now()}.pdf`)
  }

  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("audio/")) { setFileName(file.name); setAudioFile(file) }
  }

  const navItems = [
    { key: "tr", icon: "📥", label: "Transcribe" },
    { key: "qz", icon: "🧠", label: "Quiz" },
    { key: "ch", icon: "💬", label: "Chat" },
    { key: "st", icon: "⚙️", label: "Settings" },
  ]

  

  return (
    <div style={{ ...tv, fontFamily: theme === "dy" ? "'OpenDyslexic', sans-serif" : "'Plus Jakarta Sans', sans-serif", background: "var(--bg)", color: "var(--tx)", minHeight: "100vh", display: "flex", flexDirection: "column", fontSize: "13px" }}>

      {/* Top bar */}
      <header style={{ height: 50, background: "var(--bgc)", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.2rem", gap: "0.8rem", flexShrink: 0 }}>
  
  {/* Left — user info */}
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    {user?.photoURL && (
      <img src={user.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid var(--bdr)" }} />
    )}
    <span style={{ fontSize: 12, color: "var(--tx2)", fontWeight: 500 }}>
      {user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "User"}
    </span>
    <button onClick={logout} style={{ background: "transparent", border: "1.5px solid var(--bdr)", color: "var(--tx3)", fontSize: 11, padding: "4px 10px", borderRadius: 20, cursor: "pointer" }}>
      Sign out
    </button>
  </div>

  {/* Center — logo */}
  <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.1rem" }}>
    <span style={{ color: "var(--tx)" }}>Glot</span>
    <span style={{ color: "var(--ac)" }}>Class</span>
    <span style={{ color: "var(--tx3)", fontSize: "0.75rem", verticalAlign: "super" }}> AI</span>
  </div>

  {/* Right — timer + theme + classroom */}
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ background: "var(--acl)", color: "var(--ac2)", fontSize: "11.5px", fontWeight: 600, padding: "4px 12px", borderRadius: 20 }}>
      ⏱ {fmt(seconds)} studied
    </div>
    <div style={{ display: "flex", background: "var(--bg)", border: "1px solid var(--bdr)", borderRadius: 20, padding: 2, gap: 2 }}>
      {[["light", "☀️"], ["dark", "🌙"], ["dy", "👁"]].map(([t, icon]) => (
        <button key={t} onClick={() => setTheme(t)} style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: theme === t ? "var(--bgc)" : "transparent", cursor: "pointer", fontSize: 12, boxShadow: theme === t ? "0 1px 3px rgba(0,0,0,.1)" : "none" }}>
          {icon}
        </button>
      ))}
    </div>
    <button onClick={() => { window.location.href = "/teacher" }} style={{ background: "var(--ac)", color: "#fff", border: "none", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
      🏫 Teach
    </button>
    <button onClick={() => { window.location.href = "/student" }} style={{ background: "transparent", color: "var(--ac)", border: "1.5px solid var(--ac)", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
      🎓 Join
    </button>
  </div>

</header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Sidebar */}
        <aside style={{ width: 190, background: "var(--bgc)", borderRight: "1px solid var(--bdr)", display: isMobile ? "none" : "flex", flexDirection: "column", padding: "1rem 0.8rem", gap: "1rem", overflowY: "auto", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: "0.9rem", borderBottom: "1px solid var(--bdr)" }}>
            <div style={{ width: 34, height: 34, background: "var(--ac)", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>G</div>
            <div>
              <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--tx)" }}>GlotClass AI</div>
              <div style={{ fontSize: 11, color: "var(--tx3)" }}>⏱ {fmt(seconds)}</div>
            </div>
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {navItems.map(({ key, icon, label }) => (
              <button key={key} onClick={() => setTab(key)} style={{ width: "100%", textAlign: "left", padding: "8px 10px", border: "none", background: tab === key ? "var(--acl)" : "transparent", color: tab === key ? "var(--ac)" : "var(--tx2)", fontWeight: tab === key ? 700 : 500, fontSize: "12.5px", borderRadius: 8, cursor: "pointer" }}>
                {icon} {label}
              </button>
            ))}
          </nav>

          {wordCount > 0 && (
            <div style={{ marginTop: "auto", background: "var(--acl)", borderRadius: 8, padding: "9px 10px" }}>
              <div style={{ fontSize: 10, color: "var(--tx3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Transcript ready</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ac2)", marginTop: 2 }}>{wordCount} words</div>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: "auto", padding: isMobile ? "1rem 0.9rem 5rem" : "1.4rem 1.6rem" }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>

            {/* TRANSCRIBE TAB */}
            {tab === "tr" && (
              <div>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", color: "var(--tx)", fontWeight: 400, marginBottom: 3 }}>📥 Transcribe & Simplify</h2>
                <p style={{ color: "var(--tx3)", fontSize: "12.5px", marginBottom: "1.2rem" }}>Paste a YouTube URL or upload audio to begin</p>

                {/* Input toggle */}
                <div style={{ display: "flex", background: "var(--bg)", border: "1px solid var(--bdr)", borderRadius: 8, padding: 3, gap: 3, marginBottom: "1rem", width: "fit-content" }}>
                  {[["audio", "🎙️ Audio Upload"], ["youtube", "▶️ YouTube URL"]].map(([key, label]) => (
                    <button key={key} onClick={() => setInputMode(key)} style={{ padding: "7px 16px", border: "none", background: inputMode === key ? "var(--ac)" : "transparent", color: inputMode === key ? "#fff" : "var(--tx3)", borderRadius: 6, cursor: "pointer", fontSize: "12.5px", fontWeight: 600 }}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Input grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.9rem", marginBottom: "1.2rem" }}>

                  {inputMode === "audio" ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.9rem", marginBottom: "1.2rem" }}>
                      <div style={{ fontSize: "1.5rem" }}>🎙️</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--tx)" }}>Audio Upload</div>
                      <div style={{ fontSize: "11.5px", color: "var(--tx3)" }}>MP3, WAV, M4A from device</div>
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById("auinp").click()}
                        style={{ border: `2px dashed ${isDragging ? "var(--ac)" : "var(--bdr)"}`, borderRadius: 8, padding: "1rem", cursor: "pointer", textAlign: "center", color: "var(--tx3)", fontSize: 12, background: isDragging ? "var(--acl)" : "var(--bg)" }}
                      >
                        <input type="file" id="auinp" accept="audio/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files[0]; if (f) { setFileName(f.name); setAudioFile(f) } }} />
                        {fileName ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: "center" }}>
                            <span>🎵</span>
                            <span style={{ fontWeight: 600, color: "var(--tx)" }}>{fileName.length > 20 ? fileName.slice(0, 20) + "..." : fileName}</span>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                            <span style={{ fontSize: "1.4rem" }}>⬆️</span>
                            <span>Drop or <u>browse</u></span>
                            <span style={{ fontSize: "10.5px" }}>MP3 · WAV · M4A</span>
                          </div>
                        )}
                      </div>
                      {error && <div style={{ background: "#fff5f5", border: "1px solid #fcc", color: "#c00", borderRadius: 7, padding: "6px 9px", fontSize: "11.5px" }}>{error}</div>}
                      {fileName && (
                        <button onClick={handleAudioTranscribe} disabled={loading} style={{ background: "var(--ac)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
                          {loading ? "⏳ Transcribing..." : "Transcribe Audio →"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ background: "var(--bgc)", border: "1px solid var(--bdr)", borderRadius: 12, padding: "1.1rem", display: "flex", flexDirection: "column", gap: 7 }}>
                      <div style={{ fontSize: "1.5rem" }}>📺</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--tx)" }}>YouTube URL</div>
                      <div style={{ fontSize: "11.5px", color: "var(--tx3)" }}>Paste any YouTube link</div>
                      <YoutubeInput onTranscriptReady={handleYoutubeTranscript} darkMode={theme === "dark"} loading={loading} />
                      {error && <div style={{ background: "#fff5f5", border: "1px solid #fcc", color: "#c00", borderRadius: 7, padding: "6px 9px", fontSize: "11.5px" }}>{error}</div>}
                      {loading && <div style={{ color: "var(--ac)", fontSize: "11.5px" }}>⏳ Processing YouTube content...</div>}
                    </div>
                  )}

                  {/* Settings mini card */}
                  <div style={{ background: "var(--bgc)", border: "1px solid var(--bdr)", borderRadius: 12, padding: "1.1rem", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--tx)" }}>⚙️ Options</div>
                    <div>
                      <label style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--tx2)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Output Language</label>
                      <select value={language} onChange={e => setLanguage(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--bdr)", borderRadius: 8, background: "var(--bgi)", color: "var(--tx)", fontSize: 13, outline: "none" }}>
                        {LANGS.map(l => <option key={l.c} value={l.c}>{l.flag} {l.l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--tx2)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Reading Level</label>
                      <div style={{ display: "flex", gap: 5 }}>
                        {LEVELS.map(lv => (
                          <button key={lv} onClick={() => setLevel(lv)} style={{ flex: 1, padding: "7px 6px", border: `1.5px solid ${level === lv ? "var(--ac)" : "var(--bdr)"}`, borderRadius: 8, background: level === lv ? "var(--acl)" : "var(--bg)", color: level === lv ? "var(--ac2)" : "var(--tx)", fontSize: "12px", fontWeight: level === lv ? 700 : 500, cursor: "pointer" }}>
                            {lv.charAt(0).toUpperCase() + lv.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--tx2)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Font Size</label>
                      <div style={{ display: "flex", gap: 4 }}>
                        {FSZ.map(f => (
                          <button key={f.id} onClick={() => setFsz(f.id)} style={{ width: 32, height: 32, border: `1.5px solid ${fsz === f.id ? "var(--ac)" : "var(--bdr)"}`, borderRadius: 6, background: fsz === f.id ? "var(--acl)" : "transparent", color: fsz === f.id ? "var(--ac)" : "var(--tx3)", cursor: "pointer", fontWeight: 700, fontSize: f.px }}>
                            A
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Results panel */}
                {transcript && (
                  <div style={{ background: "var(--bgc)", border: "1px solid var(--bdr)", borderRadius: 12, overflow: "hidden" }}>
                    {/* Controls */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "0.9rem 1.1rem", borderBottom: "1px solid var(--bdr)", background: "var(--bg)" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[["o", "📄 Transcript"], ["s", "📖 Simplified"], ["t", "🌐 Translated"]].map(([v, label]) => (
                          <button key={v} onClick={() => setTvView(v)} disabled={v === "s" && !simplified || v === "t" && !translated} style={{ padding: "6px 13px", border: `1px solid ${tvView === v ? "var(--ac)" : "var(--bdr)"}`, background: tvView === v ? "var(--ac)" : "transparent", color: tvView === v ? "#fff" : "var(--tx3)", fontSize: 12, fontWeight: 600, borderRadius: 20, cursor: "pointer", opacity: (v === "s" && !simplified || v === "t" && !translated) ? 0.4 : 1 }}>
                            {label}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                        <button onClick={handleCopy} style={{ padding: "5px 10px", border: "1.5px solid var(--bdr)", background: "transparent", color: "var(--tx2)", fontSize: "11.5px", fontWeight: 600, borderRadius: 8, cursor: "pointer" }}>
                          {copied ? "✓ Copied" : "📋 Copy"}
                        </button>
                        <button onClick={handleDownloadPDF} style={{ padding: "5px 10px", border: "1.5px solid var(--bdr)", background: "transparent", color: "var(--tx2)", fontSize: "11.5px", fontWeight: 600, borderRadius: 8, cursor: "pointer" }}>
                          ⬇ PDF
                        </button>
                        {simplified && (
                          <button onClick={handleGenerateQuiz} disabled={quizLoading} style={{ padding: "5px 10px", border: "none", background: "var(--ac)", color: "#fff", fontSize: "11.5px", fontWeight: 600, borderRadius: 8, cursor: "pointer" }}>
                            🧠 Quiz
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Text content */}
                    <div style={{ padding: "1.2rem", lineHeight: 1.85, color: "var(--tx)", whiteSpace: "pre-wrap", minHeight: 160, maxHeight: 340, overflowY: "auto", fontSize: fszPx }}>
                      {loading ? (
                        <div style={{ textAlign: "center", color: "var(--tx3)", padding: "2rem" }}>⏳ Processing...</div>
                      ) : tvView === "o" ? transcript : tvView === "s" ? (simplified || "Click Simplify to generate.") : (translated || "Translation will appear here.")}
                    </div>

                    {/* Footer */}
                    {tvView === "o" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.9rem 1.1rem", borderTop: "1px solid var(--bdr)", background: "var(--bg)" }}>
                        <button onClick={() => processTranscript(transcript)} disabled={loading} style={{ background: "var(--ac)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                          ✨ Simplify & Translate →
                        </button>
                        <span style={{ fontSize: "11.5px", color: "var(--tx3)" }}>Uses your language & reading level</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* QUIZ TAB */}
            {tab === "qz" && (
              <div>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", color: "var(--tx)", fontWeight: 400, marginBottom: 3 }}>🧠 Quiz Yourself</h2>
                <p style={{ color: "var(--tx3)", fontSize: "12.5px", marginBottom: "1.2rem" }}>5 questions generated from your transcript</p>

                {quiz.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "3rem 1.5rem", gap: "0.9rem" }}>
                    <div style={{ fontSize: "2.5rem" }}>🧠</div>
                    <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.2rem", color: "var(--tx)", fontWeight: 400 }}>Quiz Yourself</h3>
                    <p style={{ color: "var(--tx3)", fontSize: "12.5px" }}>5 questions from your transcript</p>
                    {!transcript && (
                      <div style={{ background: "#fff8e1", border: "1px solid #ffe082", color: "#7a5c00", borderRadius: 9, padding: "9px 14px", fontSize: "12.5px" }}>
                        ⚠ Transcribe content first from the Transcribe tab.
                      </div>
                    )}
                    <button onClick={handleGenerateQuiz} disabled={!transcript || quizLoading} style={{ background: "var(--ac)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: !transcript ? 0.5 : 1 }}>
                      {quizLoading ? "⏳ Generating..." : "Generate Quiz →"}
                    </button>
                  </div>
                ) : quizSubmitted ? (
                  <div>
                    <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
                      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "3.5rem", color: "var(--ac)", lineHeight: 1 }}>{Math.round((quizScore / quiz.length) * 100)}%</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--tx)", margin: "5px 0" }}>
                        {quizScore >= 4 ? "Excellent! 🏆" : quizScore >= 2 ? "Good job! 👍" : "Keep studying! 📚"}
                      </div>
                      <div style={{ display: "flex", gap: "1.2rem", justifyContent: "center", color: "var(--tx3)", fontSize: 13 }}>
                        <span>✅ {quizScore}/{quiz.length} correct</span>
                      </div>
                    </div>
                    <div style={{ height: 8, background: "var(--bdr)", borderRadius: 10, overflow: "hidden", marginBottom: "1.4rem" }}>
                      <div style={{ height: "100%", background: quizScore >= 4 ? "var(--ac)" : quizScore >= 2 ? "#f0a500" : "#e04040", width: `${(quizScore / quiz.length) * 100}%`, borderRadius: 10 }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: "1.2rem" }}>
                      {quiz.map((q, i) => {
                        const ok = selectedAnswers[i] === q.answer
                        return (
                          <div key={i} style={{ borderRadius: 8, padding: "0.9rem 1.1rem", border: `1.5px solid ${ok ? "#a8d8a8" : "#f5b8b8"}`, background: ok ? "#f0fbf0" : "#fff5f5" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--tx3)" }}>Q{i + 1}</span>
                              <span style={{ fontSize: "12.5px", fontWeight: 700 }}>{ok ? "✅ Correct" : "❌ Incorrect"}</span>
                            </div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)", marginBottom: 7 }}>{q.question}</p>
                            {!ok && (
                              <div style={{ fontSize: 12, marginBottom: 7 }}>
                                <div style={{ color: "#c00" }}>Your: <strong>{selectedAnswers[i] || "—"}</strong></div>
                                <div style={{ color: "var(--ac2)" }}>Correct: <strong>{q.answer}</strong></div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <button onClick={() => { setQuiz([]); setSelectedAnswers({}); setQuizSubmitted(false); handleGenerateQuiz() }} style={{ background: "transparent", color: "var(--ac)", border: "1.5px solid var(--ac)", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.9rem" }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)" }}>🧠 Quiz</h3>
                      <div style={{ background: "var(--acl)", color: "var(--ac2)", fontSize: 13, fontWeight: 700, padding: "5px 13px", borderRadius: 20 }}>
                        {Object.keys(selectedAnswers).length}/{quiz.length} answered
                      </div>
                    </div>
                    <div style={{ height: 5, background: "var(--bdr)", borderRadius: 10, overflow: "hidden", marginBottom: "1.2rem" }}>
                      <div style={{ height: "100%", background: "var(--ac)", width: `${(Object.keys(selectedAnswers).length / quiz.length) * 100}%`, borderRadius: 10, transition: "width 0.4s" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.2rem" }}>
                      {quiz.map((q, i) => (
                        <div key={i} style={{ background: "var(--bgc)", border: "1px solid var(--bdr)", borderRadius: 12, padding: "1rem 1.2rem" }}>
                          <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--ac)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Q{i + 1}</div>
                          <p style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--tx)", marginBottom: "0.8rem", lineHeight: 1.4 }}>{q.question}</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                            {q.options.map((opt, j) => (
                              <button key={j} onClick={() => setSelectedAnswers({ ...selectedAnswers, [i]: opt })} style={{ textAlign: "left", padding: "8px 12px", border: `1.5px solid ${selectedAnswers[i] === opt ? "var(--ac)" : "var(--bdr)"}`, borderRadius: 8, background: selectedAnswers[i] === opt ? "var(--acl)" : "var(--bg)", color: selectedAnswers[i] === opt ? "var(--ac2)" : "var(--tx)", fontSize: 13, fontWeight: selectedAnswers[i] === opt ? 600 : 400, cursor: "pointer" }}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={handleSubmitQuiz} disabled={Object.keys(selectedAnswers).length < quiz.length} style={{ width: "100%", background: "var(--ac)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: Object.keys(selectedAnswers).length < quiz.length ? 0.5 : 1 }}>
                      Submit Answers →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* CHAT TAB */}
            {tab === "ch" && (
              <div>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", color: "var(--tx)", fontWeight: 400, marginBottom: 3 }}>💬 AI Chat</h2>
                <p style={{ color: "var(--tx3)", fontSize: "12.5px", marginBottom: "1rem" }}>Ask anything about your transcript</p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: "0.9rem" }}>
                  {["Summarise this transcript", "What are the key points?", "Explain in simple terms", "Give me 3 key facts"].map(s => (
                    <button key={s} onClick={() => setChatInput(s)} style={{ background: "var(--acl)", border: "1px solid var(--bdr)", color: "var(--ac2)", fontSize: 12, fontWeight: 500, padding: "6px 12px", borderRadius: 20, cursor: "pointer" }}>
                      {s}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", height: 390 }}>
                  <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, padding: "0.9rem", background: "var(--bgc)", border: "1px solid var(--bdr)", borderRadius: 12, marginBottom: "0.9rem" }}>
                    {chatMessages.map((msg, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                        <div style={{ maxWidth: "75%", padding: "9px 13px", borderRadius: 14, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", background: msg.role === "user" ? "var(--ac)" : "var(--bg)", color: msg.role === "user" ? "#fff" : "var(--tx)", border: msg.role === "user" ? "none" : "1px solid var(--bdr)", borderBottomRightRadius: msg.role === "user" ? 3 : 14, borderBottomLeftRadius: msg.role === "user" ? 14 : 3 }}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div style={{ display: "flex", justifyContent: "flex-start" }}>
                        <div style={{ padding: "13px 16px", borderRadius: 14, background: "var(--bg)", border: "1px solid var(--bdr)", color: "var(--tx3)", fontSize: 13 }}>
                          Thinking...
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleChatSend()}
                      placeholder="Ask anything..."
                      style={{ flex: 1, padding: "9px 12px", border: "1.5px solid var(--bdr)", borderRadius: 8, background: "var(--bgi)", color: "var(--tx)", fontSize: 13, outline: "none" }}
                    />
                    <button onClick={handleChatSend} disabled={chatLoading || !chatInput.trim()} style={{ background: "var(--ac)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: chatLoading || !chatInput.trim() ? 0.5 : 1 }}>
                      Send →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SETTINGS TAB */}
            {tab === "st" && (
              <div>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", color: "var(--tx)", fontWeight: 400, marginBottom: 3 }}>⚙️ Settings</h2>
                <p style={{ color: "var(--tx3)", fontSize: "12.5px", marginBottom: "1.2rem" }}>Customise your learning experience</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.9rem" }}>

                  <div style={{ background: "var(--bgc)", border: "1px solid var(--bdr)", borderRadius: 12, padding: "1.2rem" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)", marginBottom: 7 }}>🎨 Theme</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {[["light", "☀️ Light Mode"], ["dark", "🌙 Dark Mode"], ["dy", "👁 Dyslexia Font"]].map(([t, label]) => (
                        <button key={t} onClick={() => setTheme(t)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: `1.5px solid ${theme === t ? "var(--ac)" : "var(--bdr)"}`, borderRadius: 8, background: theme === t ? "var(--acl)" : "var(--bg)", color: theme === t ? "var(--ac2)" : "var(--tx)", fontSize: "12.5px", fontWeight: theme === t ? 600 : 400, cursor: "pointer" }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: "var(--bgc)", border: "1px solid var(--bdr)", borderRadius: 12, padding: "1.2rem" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)", marginBottom: 7 }}>🔠 Font Size</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {FSZ.map(f => (
                        <button key={f.id} onClick={() => setFsz(f.id)} style={{ padding: "7px 10px", border: `1.5px solid ${fsz === f.id ? "var(--ac)" : "var(--bdr)"}`, borderRadius: 8, background: fsz === f.id ? "var(--acl)" : "var(--bg)", color: fsz === f.id ? "var(--ac2)" : "var(--tx)", textAlign: "left", cursor: "pointer", fontSize: f.px, fontWeight: fsz === f.id ? 700 : 400 }}>
                          {f.l} — Sample text
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: "var(--bgc)", border: "1px solid var(--bdr)", borderRadius: 12, padding: "1.2rem" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)", marginBottom: 4 }}>🌐 Output Language</div>
                    <div style={{ fontSize: "11.5px", color: "var(--tx3)", marginBottom: 7 }}>Transcripts & notes will use this</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                      {LANGS.slice(0, 10).map(l => (
                        <button key={l.c} onClick={() => setLanguage(l.c)} style={{ padding: "7px 9px", border: `1.5px solid ${language === l.c ? "var(--ac)" : "var(--bdr)"}`, borderRadius: 8, background: language === l.c ? "var(--acl)" : "var(--bg)", color: language === l.c ? "var(--ac2)" : "var(--tx)", fontSize: "12.5px", fontWeight: language === l.c ? 600 : 400, cursor: "pointer" }}>
                          {l.flag} {l.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: "var(--bgc)", border: "1px solid var(--bdr)", borderRadius: 12, padding: "1.2rem" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)", marginBottom: 4 }}>📚 Reading Level</div>
                    <div style={{ fontSize: "11.5px", color: "var(--tx3)", marginBottom: 7 }}>How complex should notes be?</div>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      {LEVELS.map(lv => (
                        <button key={lv} onClick={() => setLevel(lv)} style={{ flex: 1, minWidth: 70, padding: "8px 6px", border: `1.5px solid ${level === lv ? "var(--ac)" : "var(--bdr)"}`, borderRadius: 8, background: level === lv ? "var(--acl)" : "var(--bg)", color: level === lv ? "var(--ac2)" : "var(--tx)", fontSize: "12.5px", textAlign: "center", cursor: "pointer", fontWeight: level === lv ? 700 : 400 }}>
                          {lv.charAt(0).toUpperCase() + lv.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        </main>

        {isMobile && (
          <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--bgc)", borderTop: "1px solid var(--bdr)", padding: "8px 0 12px", zIndex: 100, display: "flex", justifyContent: "space-around" }}>
            {navItems.map(({ key, icon, label }) => (
              <button key={key} onClick={() => setTab(key)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, border: "none", background: "transparent", color: tab === key ? "var(--ac)" : "var(--tx3)", cursor: "pointer", fontSize: 10, fontWeight: tab === key ? 700 : 500, padding: "4px 14px", minWidth: 60 }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                {label}
              </button>
            ))}
          </nav>
        )}

      </div>
    </div>
  )
}