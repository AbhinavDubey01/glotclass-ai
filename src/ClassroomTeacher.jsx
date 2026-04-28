import { useState, useRef } from "react"
import { db, auth, callAPI } from "./firebase"
import { ref, set, onValue, remove } from "firebase/database"

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function ClassroomTeacher() {
  const [roomCode, setRoomCode] = useState(null)
  const [isLive, setIsLive] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [simplified, setSimplified] = useState("")
  const [studentCount, setStudentCount] = useState(0)
  const [error, setError] = useState("")
  const [status, setStatus] = useState("idle")
  const [language, setLanguage] = useState("English")
  const recognitionRef = useRef(null)
  const transcriptRef = useRef("")
  const simplifyTimerRef = useRef(null)
  const isLiveRef = useRef(false)

  const LANGS = ["English","Hindi","Bengali","Tamil","Telugu","Marathi","Gujarati","Kannada","Malayalam","Punjabi","Spanish","French"]

  const createRoom = async () => {
    const code = generateRoomCode()
    setRoomCode(code)
    const roomRef = ref(db, `rooms/${code}`)
    await set(roomRef, {
      createdBy: auth.currentUser?.uid,
      teacherName: auth.currentUser?.displayName || "Teacher",
      createdAt: Date.now(),
      isLive: false,
      transcript: "",
      simplified: "",
      language,
    })
    // Watch student count
    onValue(ref(db, `rooms/${code}/students`), (snap) => {
      setStudentCount(snap.exists() ? Object.keys(snap.val()).length : 0)
    })
    setStatus("ready")
  }

  const pushTranscript = async (text) => {
    if (!roomCode) return
    await set(ref(db, `rooms/${roomCode}/transcript`), text)
    await set(ref(db, `rooms/${roomCode}/isLive`), true)

    simplifyTimerRef.current = setTimeout(async () => {
      try {
        const res = await callAPI("/api/simplify", {
          method: "POST",
          body: JSON.stringify({ text, level: "simple" }),
        })
        const data = await res.json()
        const simplifiedText = data.result || text
        setSimplified(simplifiedText)
        await set(ref(db, `rooms/${roomCode}/simplified`), simplifiedText)
        await set(ref(db, `rooms/${roomCode}/language`), language)

        // Translate if language is not English
        if (language !== "English") {
          try {
            const transRes = await callAPI("/api/translate", {
              method: "POST",
              body: JSON.stringify({ text: simplifiedText, language }),
            })
            const transData = await transRes.json()
            await set(ref(db, `rooms/${roomCode}/translated`), transData.result || "")
          } catch (e) {
            console.error("Translate error:", e)
          }
        }

      } catch (e) {
        console.error("Simplify error:", e)
      }
    }, 4000)
  }

  

const startListening = () => {
  if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
    alert("Speech recognition not supported. Please use Chrome browser.")
    return
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognition = new SpeechRecognition()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = "en-US"
  recognition.serviceURI = "wss://www.google.com/speech-api/v2/recognize"
  recognition.maxAlternatives = 1

  recognition.onstart = () => {
    console.log("🎙️ Listening started")
  }

  recognition.onresult = (event) => {
    let newFinal = ""
    let interimText = ""

    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        newFinal += event.results[i][0].transcript + " "
      } else {
        interimText += event.results[i][0].transcript
      }
    }

    if (newFinal) {
      transcriptRef.current = transcriptRef.current + newFinal
    }

    const displayText = transcriptRef.current + interimText
    setTranscript(displayText)
    pushTranscript(displayText)
  }

  recognition.onerror = (e) => {
  console.error("Speech error:", e.error)
  if (e.error === "network") {
    // Network errors on localhost are normal
    // Will work fine on HTTPS (Vercel)
    setError("Speech recognition requires HTTPS. Please test on glotclass-ai.vercel.app")
  }
}

  recognition.onend = () => {
    console.log("Recognition ended, isLive:", isLiveRef.current)
    if (isLiveRef.current) {
      setTimeout(() => {
        try {
          recognition.start()
          console.log("🔄 Restarted recognition")
        } catch (_e) {
          console.log("Restart failed:", _e)
        }
      }, 500)
    }
  }

  recognition.start()
  recognitionRef.current = recognition
  isLiveRef.current = true
  setIsLive(true)
  setStatus("live")
}

const stopListening = async () => {
  isLiveRef.current = false
  recognitionRef.current?.stop()
  setIsLive(false)
  setStatus("stopped")
  if (roomCode) {
    await set(ref(db, `rooms/${roomCode}/isLive`), false)
  }
}

  const endClass = async () => {
    stopListening()
    if (roomCode) {
      await remove(ref(db, `rooms/${roomCode}`))
    }
    setRoomCode(null)
    setTranscript("")
    setSimplified("")
    transcriptRef.current = ""
    setStatus("idle")
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4faf0", padding: "1.5rem", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontFamily: "serif", fontSize: "1.6rem", color: "#1a3d0f", margin: 0 }}>
              🏫 Teacher Mode
            </h1>
            <p style={{ color: "#6a9a52", fontSize: 13, margin: "4px 0 0" }}>
              Live classroom transcription
            </p>
          </div>
          <a href="/" style={{ color: "#52a32d", fontSize: 13, textDecoration: "none" }}>← Back to app</a>
        </div>

        {/* Create room */}
        {!roomCode ? (
          <div style={{ background: "#fff", borderRadius: 16, padding: "2rem", border: "1px solid #c8e6b0", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎓</div>
            <h2 style={{ color: "#1a3d0f", marginBottom: 8 }}>Start a Live Class</h2>
            <p style={{ color: "#6a9a52", fontSize: 13, marginBottom: "1.5rem" }}>
              Create a room and share the code with your students
            </p>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: 12, color: "#6a9a52", display: "block", marginBottom: 6 }}>Students will see notes in</label>
              <select value={language} onChange={e => setLanguage(e.target.value)}
                style={{ padding: "8px 12px", border: "1.5px solid #c8e6b0", borderRadius: 8, fontSize: 13, color: "#1a3d0f", background: "#f8fdf4" }}>
                {LANGS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <button onClick={createRoom} style={{ background: "#52a32d", color: "#fff", border: "none", borderRadius: 10, padding: "12px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              Create Room →
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Room code card */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem", border: "1px solid #c8e6b0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#6a9a52", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Room Code</div>
                  <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#52a32d", letterSpacing: "0.15em", fontFamily: "monospace" }}>
                    {roomCode}
                  </div>
                  <div style={{ fontSize: 12, color: "#6a9a52" }}>
                    Share at: <strong>glotclass-ai.vercel.app/student</strong>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: "2rem", fontWeight: 700, color: "#1a3d0f" }}>{studentCount}</div>
                  <div style={{ fontSize: 12, color: "#6a9a52" }}>students joined</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "0.8rem" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: isLive ? "#52a32d" : "#ccc", animation: isLive ? "pulse 1s infinite" : "none" }} />
                <span style={{ fontSize: 12, color: isLive ? "#52a32d" : "#999", fontWeight: 600 }}>
                  {isLive ? "LIVE" : status === "stopped" ? "PAUSED" : "READY"}
                </span>
              </div>
            </div>
            {error && (
              <div style={{ background: "#fff5f5", border: "1px solid #fcc", color: "#c00", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginTop: 8 }}>
               ⚠️  {error}
                  </div>
            )}
            {/* Controls */}
            <div style={{ display: "flex", gap: 10 }}>
              {!isLive ? (
                <button onClick={startListening} style={{ flex: 1, background: "#52a32d", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  🎙️ Start Speaking
                </button>
              ) : (
                <button onClick={stopListening} style={{ flex: 1, background: "#e04040", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  ⏸ Pause
                </button>
              )}
              <button onClick={endClass} style={{ background: "transparent", color: "#e04040", border: "1.5px solid #e04040", borderRadius: 10, padding: "12px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                End Class
              </button>
            </div>

            {/* Live transcript */}
            {transcript && (
              <div style={{ background: "#fff", borderRadius: 16, padding: "1.2rem", border: "1px solid #c8e6b0" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6a9a52", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                  📄 Live Transcript
                </div>
                <div style={{ fontSize: 13, color: "#1a3d0f", lineHeight: 1.7, maxHeight: 160, overflowY: "auto" }}>
                  {transcript}
                </div>
              </div>
            )}

            {/* Simplified */}
            {simplified && (
              <div style={{ background: "#f0fbf0", borderRadius: 16, padding: "1.2rem", border: "1px solid #a8d8a8" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#3d8120", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                  📖 Simplified Notes (sent to students)
                </div>
                <div style={{ fontSize: 13, color: "#1a3d0f", lineHeight: 1.7, maxHeight: 200, overflowY: "auto", whiteSpace: "pre-wrap" }}>
                  {simplified}
                </div>
              </div>
            )}

          </div>
        )}
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