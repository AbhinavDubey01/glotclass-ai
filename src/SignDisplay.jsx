import { useState, useEffect, useRef } from "react"

const SIGNS = {
  a: { fingers: "✊", color: "#3B82F6" },
  b: { fingers: "🖐️", color: "#8B5CF6" },
  c: { fingers: "🤏", color: "#EC4899" },
  d: { fingers: "☝️", color: "#F59E0B" },
  e: { fingers: "🤞", color: "#10B981" },
  f: { fingers: "👌", color: "#EF4444" },
  g: { fingers: "👉", color: "#6366F1" },
  h: { fingers: "🤙", color: "#14B8A6" },
  i: { fingers: "🤙", color: "#F97316" },
  j: { fingers: "🤙", color: "#84CC16" },
  k: { fingers: "✌️", color: "#3B82F6" },
  l: { fingers: "🤟", color: "#8B5CF6" },
  m: { fingers: "✊", color: "#EC4899" },
  n: { fingers: "✊", color: "#F59E0B" },
  o: { fingers: "👌", color: "#10B981" },
  p: { fingers: "🤞", color: "#EF4444" },
  q: { fingers: "👇", color: "#6366F1" },
  r: { fingers: "🤞", color: "#14B8A6" },
  s: { fingers: "✊", color: "#F97316" },
  t: { fingers: "👍", color: "#84CC16" },
  u: { fingers: "✌️", color: "#3B82F6" },
  v: { fingers: "✌️", color: "#8B5CF6" },
  w: { fingers: "🖐️", color: "#EC4899" },
  x: { fingers: "☝️", color: "#F59E0B" },
  y: { fingers: "🤙", color: "#10B981" },
  z: { fingers: "☝️", color: "#EF4444" },
}

// Word color picker
const WORD_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899",
  "#F59E0B", "#10B981", "#EF4444",
  "#6366F1", "#14B8A6", "#F97316",
]

function LetterCard({ letter, isActive }) {
  const sign = SIGNS[letter.toLowerCase()]
  if (!sign) return null
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-300"
      style={{
        width: 56,
        height: 72,
        background: isActive ? sign.color + "22" : "#f8fafc",
        borderColor: isActive ? sign.color : "#e2e8f0",
        transform: isActive ? "scale(1.25)" : "scale(1)",
        boxShadow: isActive ? `0 4px 14px ${sign.color}44` : "none",
      }}
    >
      <span style={{ fontSize: 28 }}>{sign.fingers}</span>
      <span className="text-xs font-bold mt-1" style={{ color: sign.color }}>
        {letter.toUpperCase()}
      </span>
    </div>
  )
}

function WordCard({ word, isActive, color }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border-2 px-3 py-2 transition-all duration-300"
      style={{
        minWidth: 80,
        background: isActive ? color + "22" : "#f8fafc",
        borderColor: isActive ? color : "#e2e8f0",
        transform: isActive ? "scale(1.15)" : "scale(1)",
        boxShadow: isActive ? `0 4px 14px ${color}44` : "none",
      }}
    >
      <span style={{ fontSize: 24 }}>🤟</span>
      <span
        className="text-xs font-bold mt-1 text-center"
        style={{ color: isActive ? color : "#94a3b8" }}
      >
        {word.length > 8 ? word.slice(0, 8) + "…" : word}
      </span>
    </div>
  )
}

export default function SignDisplay({ text, darkMode }) {
  const [mode, setMode] = useState("letter") // "letter" or "word"
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(600)
  const intervalRef = useRef(null)

  // Letter mode data
  const letters = text
    .toLowerCase()
    .split("")
    .filter((c) => /[a-z]/.test(c))
    .slice(0, 500)

  // Word mode data
  const words = text
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w.replace(/[^a-zA-Z]/g, ""))
    .filter((w) => w.length > 0)
    .slice(0, 200)

  const items = mode === "letter" ? letters : words
  const total = items.length

  // Window of visible cards
  const windowStart = Math.max(0, currentIndex - 4)
  const windowItems = items.slice(windowStart, windowStart + 10)

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= total - 1) {
            clearInterval(intervalRef.current)
            setTimeout(() => setIsPlaying(false), 0)
            return 0
          }
          return prev + 1
        })
      }, speed)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [isPlaying, speed, total])

  const handlePlayPause = () => {
    if (currentIndex >= total - 1) setCurrentIndex(0)
    setIsPlaying(!isPlaying)
  }

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentIndex(0)
  }

  if (!text || total === 0) {
    return (
      <div className={`rounded-xl p-6 text-center text-sm ${
        darkMode ? "bg-gray-700 text-gray-400" : "bg-slate-50 text-slate-400"
      }`}>
        Transcribe audio first to see sign language display.
      </div>
    )
  }

  const currentItem = items[currentIndex]
  const currentColor =
    mode === "letter"
      ? SIGNS[currentItem]?.color || "#3B82F6"
      : WORD_COLORS[currentIndex % WORD_COLORS.length]

  const currentEmoji =
    mode === "letter"
      ? SIGNS[currentItem]?.fingers || "👋"
      : "🤟"

  return (
    <div className={`rounded-xl p-6 ${darkMode ? "bg-gray-700" : "bg-slate-50"}`}>

      {/* Mode toggle */}
      <div className="flex justify-center mb-6">
        <div className={`flex rounded-xl p-1 gap-1 ${
          darkMode ? "bg-gray-600" : "bg-slate-200"
        }`}>
          {["letter", "word"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-5 py-1.5 rounded-lg text-xs font-medium transition ${
                mode === m
                  ? "bg-blue-600 text-white shadow"
                  : darkMode
                  ? "text-gray-300 hover:text-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {m === "letter" ? "🔤 Letter by letter" : "📝 Word by word"}
            </button>
          ))}
        </div>
      </div>

      {/* Big current display */}
      <div className="flex flex-col items-center mb-6">
        <div
          className="w-36 h-40 rounded-2xl flex flex-col items-center justify-center shadow-md border-2 mb-2 transition-all duration-300"
          style={{
            background: currentColor + "22",
            borderColor: currentColor,
          }}
        >
          <span style={{ fontSize: mode === "letter" ? 56 : 44 }}>
            {currentEmoji}
          </span>
          <span
            className="font-bold mt-2 text-center px-2"
            style={{
              color: currentColor,
              fontSize: mode === "letter" ? 28 : 16,
            }}
          >
            {mode === "letter"
              ? currentItem?.toUpperCase()
              : currentItem}
          </span>
        </div>
        <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-slate-400"}`}>
          {mode === "letter" ? "Letter" : "Word"} {currentIndex + 1} of {total}
        </p>
      </div>

      {/* Scrolling strip */}
      <div className="flex gap-2 justify-center mb-6 overflow-hidden">
        {windowItems.map((item, i) => (
          mode === "letter" ? (
            <LetterCard
              key={windowStart + i}
              letter={item}
              isActive={windowStart + i === currentIndex}
            />
          ) : (
            <WordCard
              key={windowStart + i}
              word={item}
              isActive={windowStart + i === currentIndex}
              color={WORD_COLORS[(windowStart + i) % WORD_COLORS.length]}
            />
          )
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <button
          onClick={handleReset}
          className={`px-3 py-2 rounded-lg text-sm border transition ${
            darkMode
              ? "bg-gray-600 border-gray-500 text-gray-300 hover:bg-gray-500"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
          }`}
        >
          ⏮ Reset
        </button>
        <button
          onClick={handlePlayPause}
          className="px-6 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition"
        >
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
        <button
          onClick={() => setCurrentIndex((p) => Math.min(p + 1, total - 1))}
          className={`px-3 py-2 rounded-lg text-sm border transition ${
            darkMode
              ? "bg-gray-600 border-gray-500 text-gray-300 hover:bg-gray-500"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
          }`}
        >
          Next ⏭
        </button>
      </div>

      {/* Speed slider */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-xs ${darkMode ? "text-gray-400" : "text-slate-400"}`}>
          Fast
        </span>
        <input
          type="range"
          min={200}
          max={1500}
          step={100}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="w-32"
        />
        <span className={`text-xs ${darkMode ? "text-gray-400" : "text-slate-400"}`}>
          Slow
        </span>
      </div>

    </div>
  )
}