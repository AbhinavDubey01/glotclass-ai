/* eslint-env node */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")

  const { videoId } = req.query
  if (!videoId) return res.status(400).json({ error: "videoId required" })

  try {
    const response = await fetch(
      `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=true`,
      {
        headers: {
          "x-api-key": process.env["SUPADATA_API_KEY"],
        },
      }
    )

    const data = await response.json()

    if (!response.ok || data.error) {
      return res.status(404).json({
        error: data.error || "Could not fetch transcript. Video may not have captions.",
      })
    }

    const transcript = typeof data.content === "string"
      ? data.content
      : data.transcript || data.text || ""

    if (!transcript) {
      return res.status(404).json({ error: "Transcript is empty" })
    }

    return res.status(200).json({ transcript })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}