import { useState } from "react"
import Groq from "groq-sdk"
import jsPDF from "jspdf"

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
})

export default function App() {
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

  // Quiz states
  const [quiz, setQuiz] = useState([])
  const [quizLoading, setQuizLoading] = useState(false)
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState(0)

  // Chatbot states
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", content: "Hi! I'm your GlotClass AI assistant. Ask me anything about the transcribed notes!" }
  ])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFileName(file.name)
      setAudioFile(file)
    }
  }

  const handleTranscribe = async () => {
    if (!audioFile) {
      setError("Please upload an audio file first!")
      return
    }
    setError("")
    setLoading(true)
    setTranscript("")
    setSimplified("")
    setTranslated("")
    setQuiz([])
    setSelectedAnswers({})
    setQuizSubmitted(false)
    setChatMessages([
      { role: "assistant", content: "Hi! I'm your GlotClass AI assistant. Ask me anything about the transcribed notes!" }
    ])

    try {
      const MAX_SIZE = 25 * 1024 * 1024
      let fullTranscript = ""

      if (audioFile.size > MAX_SIZE) {
        setError("Large file detected — transcribing in chunks, please wait...")
        const { FFmpeg } = await import("@ffmpeg/ffmpeg")
        const { fetchFile } = await import("@ffmpeg/util")
        const ffmpeg = new FFmpeg()
        await ffmpeg.load()
        ffmpeg.writeFile("input.mp3", await fetchFile(audioFile))
        let duration = 0
        ffmpeg.on("log", ({ message }) => {
          const match = message.match(/Duration: (\d+):(\d+):(\d+)/)
          if (match) {
            duration =
              parseInt(match[1]) * 3600 +
              parseInt(match[2]) * 60 +
              parseInt(match[3])
          }
        })
        await ffmpeg.exec(["-i", "input.mp3", "-f", "null", "-"])
        const CHUNK_DURATION = 10 * 60
        const numChunks = Math.ceil(duration / CHUNK_DURATION)
        for (let i = 0; i < numChunks; i++) {
          const start = i * CHUNK_DURATION
          const outputName = `chunk_${i}.mp3`
          await ffmpeg.exec([
            "-i", "input.mp3",
            "-ss", String(start),
            "-t", String(CHUNK_DURATION),
            "-acodec", "libmp3lame",
            outputName,
          ])
          const chunkData = await ffmpeg.readFile(outputName)
          const chunkBlob = new Blob([chunkData], { type: "audio/mpeg" })
          const chunkFile = new File([chunkBlob], outputName, { type: "audio/mpeg" })
          setError(`Transcribing chunk ${i + 1} of ${numChunks}...`)
          const res = await groq.audio.transcriptions.create({
            file: chunkFile,
            model: "whisper-large-v3-turbo",
          })
          fullTranscript += res.text + " "
        }
        setError("")
      } else {
        const res = await groq.audio.transcriptions.create({
          file: audioFile,
          model: "whisper-large-v3-turbo",
        })
        fullTranscript = res.text
      }

      setTranscript(fullTranscript)
      setActiveTab("transcript")

      let simplifiedText = fullTranscript
      try {
        const simplifyRes = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [{
            role: "user",
            content: `You are an expert teacher. Simplify the following text for a ${
              level === "simple" ? "Grade 5 student" :
              level === "medium" ? "Grade 8 student" : "advanced student"
            }.

Your response must:
- Start with a 2-3 sentence overview of the topic
- Break it into clear sections with headings using ##
- Use bullet points under each section
- Explain every key concept in simple words with examples
- End with a "Key Takeaways" section summarizing the 3-5 most important points
- Be detailed and thorough — aim for at least 300-400 words

Text to simplify:
${fullTranscript}`,
          }],
        })
        simplifiedText = simplifyRes.choices[0].message.content
        setSimplified(simplifiedText)
      } catch (_e) { // eslint-disable-line no-unused-vars
        setError("Transcription worked! But simplification failed.")
      }

      try {
        const translateRes = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [{
            role: "user",
            content: language === "English"
              ? `Clean up and format the following text with proper paragraphs and punctuation. Only return the formatted text:\n\n${simplifiedText}`
              : `Translate the following text to ${language}. Keep the headings and bullet point structure. Only return the translated text:\n\n${simplifiedText}`,
          }],
        })
        setTranslated(translateRes.choices[0].message.content)
      } catch (_e) { // eslint-disable-line no-unused-vars
        setError("Transcription worked! But translation failed.")
      }

    } catch (_e) { // eslint-disable-line no-unused-vars
      setError("Transcription failed. Check your API key and try again.")
    } finally {
      setLoading(false)
    }
  }

  // Generate quiz
  const handleGenerateQuiz = async () => {
    if (!simplified) {
      setError("Please transcribe audio first to generate a quiz!")
      return
    }
    setQuizLoading(true)
    setQuiz([])
    setSelectedAnswers({})
    setQuizSubmitted(false)
    setActiveTab("quiz")

    try {
      const res = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "user",
          content: `Based on the following notes, create exactly 5 multiple choice questions to test understanding.

Return ONLY a valid JSON array in this exact format, nothing else:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Option A"
  }
]

Notes:
${simplified}`,
        }],
      })

      let raw = res.choices[0].message.content.trim()
      raw = raw.replace(/```json|```/g, "").trim()
      const parsed = JSON.parse(raw)
      setQuiz(parsed)
    } catch (_e) { // eslint-disable-line no-unused-vars
      setError("Could not generate quiz. Please try again.")
    } finally {
      setQuizLoading(false)
    }
  }

  // Submit quiz
  const handleSubmitQuiz = () => {
    let score = 0
    quiz.forEach((q, i) => {
      if (selectedAnswers[i] === q.answer) score++
    })
    setQuizScore(score)
    setQuizSubmitted(true)
  }

  // Chatbot send
  const handleChatSend = async () => {
    if (!chatInput.trim()) return
    const userMsg = { role: "user", content: chatInput }
    const newMessages = [...chatMessages, userMsg]
    setChatMessages(newMessages)
    setChatInput("")
    setChatLoading(true)

    try {
      const res = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a helpful classroom assistant for GlotClass AI. 
The student has transcribed an audio lesson. Here are the notes:

${simplified || transcript || "No notes available yet."}

Answer the student's questions based on these notes. Be friendly, clear and encouraging. Keep answers concise but complete.`,
          },
          ...newMessages,
        ],
      })
      const assistantMsg = {
        role: "assistant",
        content: res.choices[0].message.content,
      }
      setChatMessages([...newMessages, assistantMsg])
    } catch (_e) { // eslint-disable-line no-unused-vars
      setChatMessages([...newMessages, {
        role: "assistant",
        content: "Sorry, I couldn't process that. Please try again!",
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
    const title =
      activeTab === "transcript" ? "Raw Transcript" :
      activeTab === "simplified" ? "Simplified Notes" :
      `Translation (${language})`
    doc.setFontSize(18)
    doc.setTextColor(30, 64, 175)
    doc.text("GlotClass AI", 14, 20)
    doc.setFontSize(12)
    doc.setTextColor(100, 116, 139)
    doc.text(title, 14, 30)
    doc.text(`File: ${fileName || "audio"}`, 14, 38)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 46)
    doc.setDrawColor(200, 200, 200)
    doc.line(14, 50, 196, 50)
    doc.setFontSize(11)
    doc.setTextColor(30, 30, 30)
    const lines = doc.splitTextToSize(text, 180)
    doc.text(lines, 14, 60)
    const timestamp = new Date().getTime()
    doc.save(`glotclass-${activeTab}-${timestamp}.pdf`)
  }

  const tabContent = { transcript, simplified, translated }

  const fontSizeClass =
    fontSize === "small" ? "text-xs" :
    fontSize === "large" ? "text-lg" :
    fontSize === "xlarge" ? "text-xl" :
    "text-sm"

  const dyslexiaStyle = dyslexiaFont
    ? { fontFamily: "'OpenDyslexic', sans-serif", letterSpacing: "0.05em", lineHeight: "1.9" }
    : {}

  const cardClass = `rounded-2xl p-6 shadow-sm border ${
    darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"
  }`

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-300 ${
        darkMode ? "bg-gray-900 text-white" : "bg-blue-50 text-gray-900"
      }`}
      style={dyslexiaStyle}
    >
      {/* Navbar */}
      <nav className={`px-6 py-4 flex items-center justify-between shadow ${
        darkMode ? "bg-gray-800" : "bg-blue-800"
      }`}>
        <span className="text-white text-xl font-semibold">🎓 GlotClass AI</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white text-xs px-3 py-1.5 rounded-full transition"
          >
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
          <button
            onClick={() => setDyslexiaFont(!dyslexiaFont)}
            className={`text-xs px-3 py-1.5 rounded-full transition border ${
              dyslexiaFont
                ? "bg-yellow-400 text-yellow-900 border-yellow-400"
                : "bg-white bg-opacity-20 text-white border-white border-opacity-30 hover:bg-opacity-30"
            }`}
          >
            🔤 Dyslexia Font
          </button>
          <span className="bg-blue-600 text-blue-100 text-xs px-3 py-1 rounded-full">
            Inclusive Learning
          </span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">

        {/* Upload card */}
        <div className={cardClass}>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4">
            Upload Audio
          </p>
          <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-10 cursor-pointer transition ${
            darkMode
              ? "border-blue-500 bg-gray-700 hover:bg-gray-600"
              : "border-blue-300 bg-blue-50 hover:bg-blue-100"
          }`}>
            <span className="text-4xl mb-2">🎙️</span>
            <span className="text-blue-400 font-medium text-sm">
              {fileName ? fileName : "Drop audio file here"}
            </span>
            <span className="text-slate-400 text-xs mt-1">
              or click to browse · MP3, WAV, M4A
            </span>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
          {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
          <button
            onClick={handleTranscribe}
            disabled={loading}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2.5 rounded-xl transition"
          >
            {loading ? "⏳ Processing..." : "▶ Transcribe & Translate"}
          </button>
        </div>

        {/* Settings card */}
        <div className={cardClass}>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4">
            Settings
          </p>
          <label className="block text-xs text-slate-400 mb-1">Translate to</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 text-sm mb-4 ${
              darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            {["English", "Hindi", "Bengali", "Tamil", "Telugu", "Marathi", "Spanish", "French"].map(
              (lang) => <option key={lang}>{lang}</option>
            )}
          </select>
          <label className="block text-xs text-slate-400 mb-1">Reading level</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 text-sm mb-4 ${
              darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <option value="simple">Simple (Grade 5)</option>
            <option value="medium">Medium (Grade 8)</option>
            <option value="advanced">Advanced</option>
          </select>
          <label className="block text-xs text-slate-400 mb-2">Font size</label>
          <div className="flex gap-2">
            {[
              { key: "small", size: "text-xs" },
              { key: "normal", size: "text-sm" },
              { key: "large", size: "text-base" },
              { key: "xlarge", size: "text-lg" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFontSize(f.key)}
                className={`w-10 h-10 rounded-lg border font-medium transition ${f.size} ${
                  fontSize === f.key
                    ? "bg-blue-600 text-white border-blue-600"
                    : darkMode
                    ? "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                A
              </button>
            ))}
          </div>
        </div>

        {/* Results card */}
        <div className={`${cardClass} md:col-span-2`}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Results
            </p>
            <div className="flex gap-2">
              {tabContent[activeTab] && ["transcript","simplified","translated"].includes(activeTab) && (
                <>
                  <button
                    onClick={handleCopy}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {copied ? "✅ Copied!" : "📋 Copy"}
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="text-xs px-3 py-1.5 rounded-lg border bg-blue-600 text-white border-blue-600 hover:bg-blue-700 transition"
                  >
                    📄 Download PDF
                  </button>
                </>
              )}
              {simplified && (
                <button
                  onClick={handleGenerateQuiz}
                  disabled={quizLoading}
                  className="text-xs px-3 py-1.5 rounded-lg border bg-green-600 text-white border-green-600 hover:bg-green-700 transition disabled:opacity-50"
                >
                  {quizLoading ? "⏳ Generating..." : "🧠 Generate Quiz"}
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { key: "transcript", label: "📄 Raw transcript" },
              { key: "simplified", label: "📝 Simplified notes" },
              { key: "translated", label: "🌐 Translation" },
              { key: "quiz", label: "🧠 Quiz" },
              { key: "chat", label: "💬 Chatbot" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition ${
                  activeTab === tab.key
                    ? "bg-blue-600 text-white border-blue-600"
                    : darkMode
                    ? "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600"
                    : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Transcript / Simplified / Translated content */}
          {["transcript", "simplified", "translated"].includes(activeTab) && (
            <div className={`rounded-xl p-6 min-h-32 whitespace-pre-wrap transition-all ${fontSizeClass} ${
              darkMode ? "bg-gray-700 text-gray-100" : "bg-slate-50 text-slate-700"
            }`}>
              {loading ? (
                <p className="text-center text-slate-400 animate-pulse">
                  ⏳ Processing your audio, please wait...
                </p>
              ) : tabContent[activeTab] ? (
                tabContent[activeTab]
              ) : (
                <p className="text-center text-slate-400">
                  Upload an audio file above and click Transcribe to see results here.
                </p>
              )}
            </div>
          )}

          {/* Quiz tab */}
          {activeTab === "quiz" && (
            <div className={`rounded-xl p-6 min-h-32 ${
              darkMode ? "bg-gray-700 text-gray-100" : "bg-slate-50 text-slate-700"
            }`}>
              {quizLoading ? (
                <p className="text-center text-slate-400 animate-pulse">⏳ Generating quiz questions...</p>
              ) : quiz.length === 0 ? (
                <p className="text-center text-slate-400 text-sm">
                  Click "Generate Quiz" above to create questions from your notes.
                </p>
              ) : (
                <div className="space-y-6">
                  {quizSubmitted && (
                    <div className={`rounded-xl p-4 text-center mb-4 ${
                      quizScore >= 4 ? "bg-green-100 text-green-800" :
                      quizScore >= 2 ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      <p className="text-lg font-bold">
                        {quizScore >= 4 ? "🎉 Excellent!" : quizScore >= 2 ? "👍 Good effort!" : "📚 Keep studying!"}
                      </p>
                      <p className="text-sm">You scored {quizScore} out of {quiz.length}</p>
                    </div>
                  )}
                  {quiz.map((q, i) => (
                    <div key={i} className={`rounded-xl p-4 border ${
                      darkMode ? "border-gray-600 bg-gray-800" : "border-slate-200 bg-white"
                    }`}>
                      <p className="font-medium text-sm mb-3">
                        {i + 1}. {q.question}
                      </p>
                      <div className="space-y-2">
                        {q.options.map((opt, j) => {
                          const isSelected = selectedAnswers[i] === opt
                          const isCorrect = opt === q.answer
                          let optClass = "border rounded-lg px-3 py-2 text-xs cursor-pointer transition w-full text-left "
                          if (quizSubmitted) {
                            if (isCorrect) optClass += "bg-green-100 border-green-400 text-green-800"
                            else if (isSelected) optClass += "bg-red-100 border-red-400 text-red-800"
                            else optClass += darkMode ? "border-gray-600 text-gray-400" : "border-slate-200 text-slate-400"
                          } else {
                            if (isSelected) optClass += "bg-blue-100 border-blue-400 text-blue-800"
                            else optClass += darkMode
                              ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                              : "border-slate-200 text-slate-600 hover:bg-slate-100"
                          }
                          return (
                            <button
                              key={j}
                              className={optClass}
                              onClick={() => !quizSubmitted && setSelectedAnswers({ ...selectedAnswers, [i]: opt })}
                            >
                              {opt}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  {!quizSubmitted ? (
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={Object.keys(selectedAnswers).length < quiz.length}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium py-2.5 rounded-xl transition text-sm"
                    >
                      Submit Quiz
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setQuiz([])
                        setSelectedAnswers({})
                        setQuizSubmitted(false)
                        handleGenerateQuiz()
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition text-sm"
                    >
                      🔄 Try New Quiz
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Chatbot tab */}
          {activeTab === "chat" && (
            <div className={`rounded-xl overflow-hidden border ${
              darkMode ? "border-gray-600" : "border-slate-200"
            }`}>
              {/* Messages */}
              <div className={`p-4 space-y-3 h-72 overflow-y-auto ${
                darkMode ? "bg-gray-700" : "bg-slate-50"
              }`}>
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : darkMode
                          ? "bg-gray-600 text-gray-100 rounded-bl-sm"
                          : "bg-white text-slate-700 border border-slate-200 rounded-bl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className={`px-4 py-2 rounded-2xl text-sm animate-pulse ${
                      darkMode ? "bg-gray-600 text-gray-300" : "bg-white text-slate-400 border border-slate-200"
                    }`}>
                      Thinking...
                    </div>
                  </div>
                )}
              </div>
              {/* Input */}
              <div className={`flex gap-2 p-3 border-t ${
                darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-slate-200"
              }`}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
                  placeholder="Ask something about the notes..."
                  className={`flex-1 rounded-xl px-4 py-2 text-sm border outline-none ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400"
                  }`}
                />
                <button
                  onClick={handleChatSend}
                  disabled={chatLoading || !chatInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
                >
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