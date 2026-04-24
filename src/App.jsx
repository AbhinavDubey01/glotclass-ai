import { useState } from "react"
import jsPDF from "jspdf"
import YoutubeInput from "./YoutubeInput"

const API = import.meta.env.DEV
  ? "http://localhost:5000"
  : "https://glotclass-backend.onrender.com"

async function fetchYoutubeTranscript(videoId) {
  const res = await fetch(`${API}/api/transcript?videoId=${videoId}`)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error)
  return data.transcript
}

export default function App() {
  const [inputMode, setInputMode] = useState("audio")
  const [activeTab, setActiveTab] = useState("transcript")
  const [language, setLanguage] = useState("English")
  const [level, setLevel] = useState("simple")
  const [fileName, setFileName] = useState(null)
  const [audioFile, setAudioFile] = useState(null)
  const [transcript, setTranscript] = useState("")
  const [simplified, setSimplified] = useState("")
  const [translated, setTranslated] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [dyslexiaFont, setDyslexiaFont] = useState(false)
  const [fontSize, setFontSize] = useState("normal")
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [quiz, setQuiz] = useState([])
  const [quizLoading, setQuizLoading] = useState(false)
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState(0)
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", content: "Hi! I'm your GlotClass AI assistant. Ask me anything about the notes!" }
  ])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)

  const resetResults = () => {
    setTranscript("")
    setSimplified("")
    setTranslated("")
    setQuiz([])
    setSelectedAnswers({})
    setQuizSubmitted(false)
    setChatMessages([
      { role: "assistant", content: "Hi! I'm your GlotClass AI assistant. Ask me anything about the notes!" }
    ])
    setError("")
  }

  const processTranscript = async (rawText) => {
    setTranscript(rawText)
    setActiveTab("transcript")

    try {
      const simplifyRes = await fetch(`${API}/api/simplify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText, level }),
      })
      const simplifyData = await simplifyRes.json()
      const simplifiedText = simplifyData.result || rawText
      setSimplified(simplifiedText)

      const translateRes = await fetch(`${API}/api/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: simplifiedText, language }),
      })
      const translateData = await translateRes.json()
      setTranslated(translateData.result || "")
    } catch {

      setError("Processing failed. Please try again.")
    }
  }

  const handleAudioTranscribe = async () => {
    if (!audioFile) {
      setError("Please upload an audio file first!")
      return
    }
    resetResults()
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("file", audioFile)
      const res = await fetch(`${API}/api/transcribe`, {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      await processTranscript(data.transcript)
    } catch {

      setError("Transcription failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleYoutubeTranscript = async (videoId, url) => {
    resetResults()
    setLoading(true)
    setYoutubeUrl(url)
    setError("Fetching YouTube transcript...")

    try {
      const rawText = await fetchYoutubeTranscript(videoId)
      setError("")
      await processTranscript(rawText)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateQuiz = async () => {
    if (!simplified) return
    setQuizLoading(true)
    setQuiz([])
    setSelectedAnswers({})
    setQuizSubmitted(false)
    setActiveTab("quiz")

    try {
      const res = await fetch(`${API}/api/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: simplified }),
      })
      const data = await res.json()
      setQuiz(data.quiz || [])
    } catch {

      setError("Could not generate quiz.")
    } finally {
      setQuizLoading(false)
    }
  }

  const handleSubmitQuiz = () => {
    let score = 0
    quiz.forEach((q, i) => { if (selectedAnswers[i] === q.answer) score++ })
    setQuizScore(score)
    setQuizSubmitted(true)
  }

  const handleChatSend = async () => {
    if (!chatInput.trim()) return
    const userMsg = { role: "user", content: chatInput }
    const newMessages = [...chatMessages, userMsg]
    setChatMessages(newMessages)
    setChatInput("")
    setChatLoading(true)

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          context: simplified || transcript,
        }),
      })
      const data = await res.json()
      setChatMessages([...newMessages, {
        role: "assistant",
        content: data.result || "Sorry I could not process that.",
      }])
    } catch {

      setChatMessages([...newMessages, {
        role: "assistant",
        content: "Sorry, something went wrong!",
      }])
    } finally {
      setChatLoading(false)
    }
  }

  const handleCopy = () => {
    const text = tabContent[activeTab]
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadPDF = () => {
    const text = tabContent[activeTab]
    if (!text) return
    const doc = new jsPDF()
    const title = activeTab === "transcript" ? "Raw Transcript" :
      activeTab === "simplified" ? "Simplified Notes" : `Translation (${language})`
    doc.setFontSize(18)
    doc.setTextColor(30, 64, 175)
    doc.text("GlotClass AI", 14, 20)
    doc.setFontSize(12)
    doc.setTextColor(100, 116, 139)
    doc.text(title, 14, 30)
    doc.text(`Source: ${fileName || youtubeUrl || "audio"}`, 14, 38)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 46)
    doc.setDrawColor(200, 200, 200)
    doc.line(14, 50, 196, 50)
    doc.setFontSize(11)
    doc.setTextColor(30, 30, 30)
    const lines = doc.splitTextToSize(text, 180)
    doc.text(lines, 14, 60)
    doc.save(`glotclass-${activeTab}-${new Date().getTime()}.pdf`)
  }

  const tabContent = { transcript, simplified, translated }
  const fontSizeClass = fontSize === "small" ? "text-xs" : fontSize === "large" ? "text-lg" : fontSize === "xlarge" ? "text-xl" : "text-sm"
  const dyslexiaStyle = dyslexiaFont ? { fontFamily: "'OpenDyslexic', sans-serif", letterSpacing: "0.05em", lineHeight: "1.9" } : {}
  const cardClass = `rounded-2xl p-6 shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"}`

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-300 ${darkMode ? "bg-gray-900 text-white" : "bg-blue-50 text-gray-900"}`}
      style={dyslexiaStyle}
    >
      <nav className={`px-6 py-4 flex items-center justify-between shadow ${darkMode ? "bg-gray-800" : "bg-blue-800"}`}>
        <span className="text-white text-xl font-semibold">🎓 GlotClass AI</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setDarkMode(!darkMode)} className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white text-xs px-3 py-1.5 rounded-full transition">
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
          <button onClick={() => setDyslexiaFont(!dyslexiaFont)} className={`text-xs px-3 py-1.5 rounded-full transition border ${dyslexiaFont ? "bg-yellow-400 text-yellow-900 border-yellow-400" : "bg-white bg-opacity-20 text-white border-white border-opacity-30 hover:bg-opacity-30"}`}>
            🔤 Dyslexia Font
          </button>
          <span className="bg-blue-600 text-blue-100 text-xs px-3 py-1 rounded-full">Inclusive Learning</span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">

        <div className={cardClass}>
          <div className={`flex rounded-xl p-1 gap-1 mb-4 ${darkMode ? "bg-gray-700" : "bg-slate-100"}`}>
            {[{ key: "audio", label: "🎙️ Audio Upload" }, { key: "youtube", label: "▶️ YouTube URL" }].map((m) => (
              <button key={m.key} onClick={() => setInputMode(m.key)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${inputMode === m.key ? "bg-blue-600 text-white shadow" : darkMode ? "text-gray-300" : "text-slate-500"}`}>
                {m.label}
              </button>
            ))}
          </div>

          {inputMode === "audio" && (
            <>
              <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-10 cursor-pointer transition ${darkMode ? "border-blue-500 bg-gray-700 hover:bg-gray-600" : "border-blue-300 bg-blue-50 hover:bg-blue-100"}`}>
                <span className="text-4xl mb-2">🎙️</span>
                <span className="text-blue-400 font-medium text-sm">{fileName ? fileName : "Drop audio file here"}</span>
                <span className="text-slate-400 text-xs mt-1">or click to browse · MP3, WAV, M4A</span>
                <input type="file" accept="audio/*" className="hidden" onChange={(e) => {
                  const file = e.target.files[0]
                  if (file) { setFileName(file.name); setAudioFile(file) }
                }} />
              </label>
              {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
              <button onClick={handleAudioTranscribe} disabled={loading}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2.5 rounded-xl transition">
                {loading ? "⏳ Processing..." : "▶ Transcribe & Translate"}
              </button>
            </>
          )}

          {inputMode === "youtube" && (
            <>
              <YoutubeInput onTranscriptReady={handleYoutubeTranscript} darkMode={darkMode} loading={loading} />
              {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
              {loading && <p className="text-blue-400 text-xs mt-3 animate-pulse">⏳ Processing YouTube content...</p>}
            </>
          )}
        </div>

        <div className={cardClass}>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4">Settings</p>
          <label className="block text-xs text-slate-400 mb-1">Translate to</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 text-sm mb-4 ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
            {["English", "Hindi", "Bengali", "Tamil", "Telugu", "Marathi", "Spanish", "French"].map(
              (lang) => <option key={lang}>{lang}</option>
            )}
          </select>
          <label className="block text-xs text-slate-400 mb-1">Reading level</label>
          <select value={level} onChange={(e) => setLevel(e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 text-sm mb-4 ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
            <option value="simple">Simple (Grade 5)</option>
            <option value="medium">Medium (Grade 8)</option>
            <option value="advanced">Advanced</option>
          </select>
          <label className="block text-xs text-slate-400 mb-2">Font size</label>
          <div className="flex gap-2">
            {[{ key: "small", size: "text-xs" }, { key: "normal", size: "text-sm" }, { key: "large", size: "text-base" }, { key: "xlarge", size: "text-lg" }].map((f) => (
              <button key={f.key} onClick={() => setFontSize(f.key)}
                className={`w-10 h-10 rounded-lg border font-medium transition ${f.size} ${fontSize === f.key ? "bg-blue-600 text-white border-blue-600" : darkMode ? "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                A
              </button>
            ))}
          </div>
        </div>

        <div className={`${cardClass} md:col-span-2`}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Results</p>
            <div className="flex gap-2 flex-wrap">
              {tabContent[activeTab] && ["transcript", "simplified", "translated"].includes(activeTab) && (
                <>
                  <button onClick={handleCopy} className={`text-xs px-3 py-1.5 rounded-lg border transition ${darkMode ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                    {copied ? "✅ Copied!" : "📋 Copy"}
                  </button>
                  <button onClick={handleDownloadPDF} className="text-xs px-3 py-1.5 rounded-lg border bg-blue-600 text-white border-blue-600 hover:bg-blue-700 transition">
                    📄 Download PDF
                  </button>
                </>
              )}
              {simplified && (
                <button onClick={handleGenerateQuiz} disabled={quizLoading}
                  className="text-xs px-3 py-1.5 rounded-lg border bg-green-600 text-white border-green-600 hover:bg-green-700 transition disabled:opacity-50">
                  {quizLoading ? "⏳ Generating..." : "🧠 Generate Quiz"}
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { key: "transcript", label: "📄 Raw transcript" },
              { key: "simplified", label: "📝 Simplified notes" },
              { key: "translated", label: "🌐 Translation" },
              { key: "quiz", label: "🧠 Quiz" },
              { key: "chat", label: "💬 Chatbot" },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition ${activeTab === tab.key ? "bg-blue-600 text-white border-blue-600" : darkMode ? "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {["transcript", "simplified", "translated"].includes(activeTab) && (
            <div className={`rounded-xl p-6 min-h-32 whitespace-pre-wrap transition-all ${fontSizeClass} ${darkMode ? "bg-gray-700 text-gray-100" : "bg-slate-50 text-slate-700"}`}>
              {loading ? (
                <p className="text-center text-slate-400 animate-pulse">⏳ Processing, please wait...</p>
              ) : tabContent[activeTab] ? tabContent[activeTab] : (
                <p className="text-center text-slate-400">Upload audio or paste a YouTube URL to see results here.</p>
              )}
            </div>
          )}

          {activeTab === "quiz" && (
            <div className={`rounded-xl p-6 min-h-32 ${darkMode ? "bg-gray-700 text-gray-100" : "bg-slate-50 text-slate-700"}`}>
              {quizLoading ? (
                <p className="text-center text-slate-400 animate-pulse">⏳ Generating quiz questions...</p>
              ) : quiz.length === 0 ? (
                <p className="text-center text-slate-400 text-sm">Click "Generate Quiz" above to create questions from your notes.</p>
              ) : (
                <div className="space-y-6">
                  {quizSubmitted && (
                    <div className={`rounded-xl p-4 text-center mb-4 ${quizScore >= 4 ? "bg-green-100 text-green-800" : quizScore >= 2 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                      <p className="text-lg font-bold">{quizScore >= 4 ? "🎉 Excellent!" : quizScore >= 2 ? "👍 Good effort!" : "📚 Keep studying!"}</p>
                      <p className="text-sm">You scored {quizScore} out of {quiz.length}</p>
                    </div>
                  )}
                  {quiz.map((q, i) => (
                    <div key={i} className={`rounded-xl p-4 border ${darkMode ? "border-gray-600 bg-gray-800" : "border-slate-200 bg-white"}`}>
                      <p className="font-medium text-sm mb-3">{i + 1}. {q.question}</p>
                      <div className="space-y-2">
                        {q.options.map((opt, j) => {
                          const isSelected = selectedAnswers[i] === opt
                          const isCorrect = opt === q.answer
                          let cls = "border rounded-lg px-3 py-2 text-xs cursor-pointer transition w-full text-left "
                          if (quizSubmitted) {
                            if (isCorrect) cls += "bg-green-100 border-green-400 text-green-800"
                            else if (isSelected) cls += "bg-red-100 border-red-400 text-red-800"
                            else cls += darkMode ? "border-gray-600 text-gray-400" : "border-slate-200 text-slate-400"
                          } else {
                            if (isSelected) cls += "bg-blue-100 border-blue-400 text-blue-800"
                            else cls += darkMode ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-slate-200 text-slate-600 hover:bg-slate-100"
                          }
                          return (
                            <button key={j} className={cls} onClick={() => !quizSubmitted && setSelectedAnswers({ ...selectedAnswers, [i]: opt })}>
                              {opt}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  {!quizSubmitted ? (
                    <button onClick={handleSubmitQuiz} disabled={Object.keys(selectedAnswers).length < quiz.length}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium py-2.5 rounded-xl transition text-sm">
                      Submit Quiz
                    </button>
                  ) : (
                    <button onClick={() => { setQuiz([]); setSelectedAnswers({}); setQuizSubmitted(false); handleGenerateQuiz() }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition text-sm">
                      🔄 Try New Quiz
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "chat" && (
            <div className={`rounded-xl overflow-hidden border ${darkMode ? "border-gray-600" : "border-slate-200"}`}>
              <div className={`p-4 space-y-3 h-72 overflow-y-auto ${darkMode ? "bg-gray-700" : "bg-slate-50"}`}>
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${msg.role === "user" ? "bg-blue-600 text-white rounded-br-sm" : darkMode ? "bg-gray-600 text-gray-100 rounded-bl-sm" : "bg-white text-slate-700 border border-slate-200 rounded-bl-sm"}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className={`px-4 py-2 rounded-2xl text-sm animate-pulse ${darkMode ? "bg-gray-600 text-gray-300" : "bg-white text-slate-400 border border-slate-200"}`}>
                      Thinking...
                    </div>
                  </div>
                )}
              </div>
              <div className={`flex gap-2 p-3 border-t ${darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-slate-200"}`}>
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
                  placeholder="Ask something about the notes..."
                  className={`flex-1 rounded-xl px-4 py-2 text-sm border outline-none ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400"}`}
                />
                <button onClick={handleChatSend} disabled={chatLoading || !chatInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
                  Send
                </button>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}