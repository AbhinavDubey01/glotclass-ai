export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")

  const { videoId } = req.query
  if (!videoId) return res.status(400).json({ error: "videoId required" })

  try {
    // Method 1 — Try YouTube transcript via timedtext API
    const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`
    const r1 = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    if (r1.ok) {
      const data = await r1.json()
      if (data?.events?.length > 0) {
        const transcript = data.events
          .filter((e) => e.segs)
          .map((e) => e.segs.map((s) => s.utf8).join(""))
          .join(" ")
          .replace(/\n/g, " ")
          .trim()

        if (transcript) return res.status(200).json({ transcript })
      }
    }

    // Method 2 — Try auto-generated captions
    const url2 = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=json3`
    const r2 = await fetch(url2, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    if (r2.ok) {
      const data2 = await r2.json()
      if (data2?.events?.length > 0) {
        const transcript = data2.events
          .filter((e) => e.segs)
          .map((e) => e.segs.map((s) => s.utf8).join(""))
          .join(" ")
          .replace(/\n/g, " ")
          .trim()

        if (transcript) return res.status(200).json({ transcript })
      }
    }

    // Method 3 — Try asr (auto speech recognition captions)
    const url3 = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr&fmt=json3`
    const r3 = await fetch(url3, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    if (r3.ok) {
      const data3 = await r3.json()
      if (data3?.events?.length > 0) {
        const transcript = data3.events
          .filter((e) => e.segs)
          .map((e) => e.segs.map((s) => s.utf8).join(""))
          .join(" ")
          .replace(/\n/g, " ")
          .trim()

        if (transcript) return res.status(200).json({ transcript })
      }
    }

    // Method 4 — Try fetching available tracks list
    const listUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&type=list`
    const listRes = await fetch(listUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })
    const listXml = await listRes.text()

    const langMatch = listXml.match(/lang_code="([^"]+)"/)
    if (langMatch) {
      const lang = langMatch[1]
      const url4 = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`
      const r4 = await fetch(url4, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })
      if (r4.ok) {
        const data4 = await r4.json()
        if (data4?.events?.length > 0) {
          const transcript = data4.events
            .filter((e) => e.segs)
            .map((e) => e.segs.map((s) => s.utf8).join(""))
            .join(" ")
            .replace(/\n/g, " ")
            .trim()

          if (transcript) return res.status(200).json({ transcript })
        }
      }
    }

    return res.status(404).json({
      error: "Could not fetch captions. This video may have captions disabled or restricted.",
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}