import { useState } from "react"

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    /(?:youtube\.com\/shorts\/)([^&\n?#]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export default function YoutubeInput({ onTranscriptReady, darkMode, loading }) {
  const [url, setUrl] = useState("")
  const [error, setError] = useState("")
  const [videoId, setVideoId] = useState(null)

  const handleLoad = async () => {
    setError("")
    const id = extractVideoId(url)
    if (!id) {
      setError("Invalid YouTube URL. Please check and try again.")
      return
    }
    setVideoId(id)
    onTranscriptReady(id, url)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLoad()}
          placeholder="Paste YouTube URL here..."
          className={`flex-1 rounded-xl px-4 py-2 text-sm border outline-none ${
            darkMode
              ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              : "bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400"
          }`}
        />
        <button
          onClick={handleLoad}
          disabled={loading || !url.trim()}
          className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
        >
          ▶ Load
        </button>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {videoId && (
        <div className="rounded-xl overflow-hidden aspect-video">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${videoId}`}
            allowFullScreen
            className="rounded-xl"
          />
        </div>
      )}
    </div>
  )
}