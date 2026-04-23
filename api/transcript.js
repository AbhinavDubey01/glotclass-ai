export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")

  const { videoId } = req.query
  if (!videoId) return res.status(400).json({ error: "videoId required" })

  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })

    const html = await response.text()
    const captionMatch = html.match(/"captionTracks":\[(.*?)\]/)
    if (!captionMatch) return res.status(404).json({ error: "No captions found. Try a video with English subtitles like TED Talks or Khan Academy." })

    const captionTracks = JSON.parse(`[${captionMatch[1]}]`)
    const track =
      captionTracks.find((t) => t.languageCode === "en") ||
      captionTracks.find((t) => t.languageCode?.startsWith("en")) ||
      captionTracks[0]

    if (!track) {
  const available = captionTracks.map(t => t.languageCode).join(", ")
  return res.status(404).json({ error: `No English captions. Available languages: ${available}` })
}

    const captionRes = await fetch(track.baseUrl)
    const captionXml = await captionRes.text()

    const textMatches = captionXml.match(/<text[^>]*>(.*?)<\/text>/gs) || []
    const transcript = textMatches
      .map((t) =>
        t.replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
      )
      .join(" ")
      .trim()

    if (!transcript) return res.status(404).json({ error: "Transcript is empty" })
    return res.status(200).json({ transcript })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}