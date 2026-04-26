from auth import require_auth
from flask import Flask, request, jsonify
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi
from groq import Groq
import os
import requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# ── YouTube transcript ──────────────────────────────────────────
@app.route("/api/transcript", methods=["GET"])
@require_auth
def get_transcript():
    video_id = request.args.get("videoId")
    if not video_id:
        return jsonify({"error": "videoId is required"}), 400

    # Method 1 — youtube-transcript-api
    try:
        ytt = YouTubeTranscriptApi()
        try:
            tlist = ytt.fetch(video_id, languages=["en", "en-US", "en-GB"])
            text = " ".join([t.text for t in tlist])
            if text:
                return jsonify({"transcript": text})
        except Exception:
            pass
        try:
            all_t = ytt.list(video_id)
            first = next(iter(all_t))
            text = " ".join([t.text for t in first.fetch()])
            if text:
                return jsonify({"transcript": text})
        except Exception:
            pass
    except Exception:
        pass

    # Method 2 — Supadata fallback
    supadata_key = os.environ.get("SUPADATA_API_KEY", "")
    if supadata_key:
        try:
            r = requests.get(
                f"https://api.supadata.ai/v1/youtube/transcript",
                params={"videoId": video_id, "text": "true"},
                headers={"x-api-key": supadata_key},
                timeout=30
            )
            data = r.json()
            text = data.get("content") or data.get("transcript") or data.get("text", "")
            if text:
                return jsonify({"transcript": text})
            return jsonify({"error": data.get("error", "Supadata returned empty")}), 404
        except Exception as e:
            return jsonify({"error": f"Supadata failed: {str(e)}"}), 500

    return jsonify({"error": "No transcript method available"}), 404


# ── Simplify ────────────────────────────────────────────────────
@app.route("/api/simplify", methods=["POST"])
@require_auth
def simplify():
    data = request.json
    text = data.get("text", "")
    level = data.get("level", "simple")

    level_map = {
        "simple": "Grade 5 student",
        "medium": "Grade 8 student",
        "advanced": "advanced student"
    }

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{
                "role": "user",
                "content": f"""You are an expert teacher. Simplify the following text for a {level_map.get(level, 'Grade 5 student')}.

Your response must:
- Start with a 2-3 sentence overview of the topic
- Break it into clear sections with headings using ##
- Use bullet points under each section
- Explain every key concept in simple words with examples
- End with a Key Takeaways section summarizing the 3-5 most important points
- Be detailed and thorough, aim for at least 300-400 words

Text to simplify:
{text}"""
            }]
        )
        return jsonify({"result": response.choices[0].message.content})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Translate ───────────────────────────────────────────────────
@app.route("/api/translate", methods=["POST"])
@require_auth
def translate():
    data = request.json
    text = data.get("text", "")
    language = data.get("language", "English")

    prompt = (
        f"Clean up and format the following text with proper paragraphs and punctuation. Only return the formatted text:\n\n{text}"
        if language == "English"
        else f"Translate the following text to {language}. Keep the headings and bullet point structure. Only return the translated text:\n\n{text}"
    )

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}]
        )
        return jsonify({"result": response.choices[0].message.content})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Quiz ────────────────────────────────────────────────────────
@app.route("/api/quiz", methods=["POST"])
@require_auth
def quiz():
    data = request.json
    text = data.get("text", "")

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{
                "role": "user",
                "content": f"""Based on the following notes, create exactly 5 multiple choice questions to test understanding.

Return ONLY a valid JSON array in this exact format, nothing else:
[
  {{
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Option A"
  }}
]

Notes:
{text}"""
            }]
        )
        import json
        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        return jsonify({"quiz": json.loads(raw)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Chat ────────────────────────────────────────────────────────
@app.route("/api/chat", methods=["POST"])
@require_auth
def chat():
    data = request.json
    messages = data.get("messages", [])
    context = data.get("context", "")

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": f"""You are a helpful classroom assistant for GlotClass AI.
The student has the following notes:

{context}

Answer questions based on these notes. Be friendly, clear and encouraging."""
                },
                *messages
            ]
        )
        return jsonify({"result": response.choices[0].message.content})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Whisper transcription ───────────────────────────────────────
@app.route("/api/transcribe", methods=["POST"])
@require_auth
def transcribe():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    audio_file = request.files["file"]

    try:
        transcription = client.audio.transcriptions.create(
            file=(audio_file.filename, audio_file.read(), audio_file.content_type),
            model="whisper-large-v3-turbo",
        )
        return jsonify({"transcript": transcription.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)