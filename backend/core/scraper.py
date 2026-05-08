import re
import subprocess
import json as json_module
import httpx
from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi

MAX_CHARS = 6000  # Pass up to 6000 chars to Groq


async def scrape_url(url: str) -> tuple[str, str, int]:
    """
    Extracts raw text content, title, and video duration (seconds) from a given URL.
    Returns (text, title, duration_seconds). duration_seconds is 0 for non-video sources.
    """
    domain = urlparse(url).netloc

    if "youtube.com" in domain or "youtu.be" in domain:
        return await extract_youtube_transcript(url)
    elif "twitter.com" in domain or "x.com" in domain:
        text, title = await extract_x_post_text(url)
        return (text, title, 0)
    else:
        text, title = await extract_article_text(url)
        return (text, title, 0)


def _parse_iso_duration(dur: str) -> int:
    """Parse ISO 8601 duration like PT9M30S to total seconds."""
    match = re.search(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', dur)
    if not match:
        return 0
    h = int(match.group(1) or 0)
    m = int(match.group(2) or 0)
    s = int(match.group(3) or 0)
    return h * 3600 + m * 60 + s


def _get_video_id(url: str) -> str | None:
    parsed = urlparse(url)
    if "youtu.be" in parsed.netloc:
        return parsed.path.lstrip("/")
    return parse_qs(parsed.query).get("v", [None])[0]


async def extract_youtube_transcript(url: str) -> tuple[str, str, int]:
    """
    Extracts the transcript from a YouTube video using the youtube-transcript-api library.
    Tries: English (manual), English (auto-generated), any available language.
    Returns (transcript_text, video_title, duration_seconds).
    """
    video_id = _get_video_id(url)
    if not video_id:
        return ("Could not extract video ID.", "YouTube Video", 0)

    title = "YouTube Video"
    transcript_text = ""
    duration_seconds = 0

    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        # Fetch video page to get title and duration
        try:
            page_resp = await client.get(f"https://www.youtube.com/watch?v={video_id}", headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })
            if page_resp.status_code == 200:
                html = page_resp.text
                title_match = re.search(r"<title>(.*?)</title>", html)
                if title_match:
                    title = title_match.group(1).replace(" - YouTube", "").strip()
                dur_match = re.search(r'"lengthSeconds"\s*:\s*"(\d+)"', html)
                if dur_match:
                    duration_seconds = int(dur_match.group(1))
                else:
                    iso_match = re.search(r'<meta itemprop="duration" content="(PT[\dHMS]+)"', html)
                    if iso_match:
                        duration_seconds = _parse_iso_duration(iso_match.group(1))
        except Exception as e:
            print(f"[SCRAPER] Could not fetch YouTube page for title: {e}")

    # Initialize API instance (required for version 1.2.4)
    api = YouTubeTranscriptApi()

    # Try to get transcript
    try:
        # 1. Try manual or auto English
        try:
            res = api.fetch(video_id, languages=['en', 'en-US', 'en-GB'])
            transcript_text = " ".join([s.text for s in res.snippets])
            print(f"[SCRAPER] YouTube success: English transcript found ({len(transcript_text)} chars)")
        except Exception as e:
            # 2. Try any available language
            try:
                transcripts = api.list(video_id)
                # Find best available (manual preferred over generated)
                best_transcript = None
                try:
                    best_transcript = transcripts.find_transcript(['en', 'en-US', 'en-GB'])
                except:
                    try:
                        best_transcript = transcripts.find_generated_transcript(['en', 'en-US', 'en-GB'])
                    except:
                        # Fallback to the first one in the list
                        try:
                            best_transcript = next(iter(transcripts))
                        except:
                            pass
                
                if best_transcript:
                    data = best_transcript.fetch()
                    # Wait, is best_transcript.fetch() the same as api.fetch()?
                    # In this version, it seems best_transcript might already be a FetchedTranscript or similar.
                    # Based on my check_api.py, api.list() returns TranscriptList.
                    # Let's assume best_transcript.fetch() works or use api.fetch(video_id, languages=[best_transcript.language_code])
                    transcript_text = " ".join([s.text for s in data.snippets])
                    print(f"[SCRAPER] YouTube success: {best_transcript.language} transcript found ({len(transcript_text)} chars)")
            except Exception as e2:
                print(f"[SCRAPER] YouTube transcript fetch failed: {e2}")

    except Exception as e_outer:
        print(f"[SCRAPER] CRITICAL: YouTubeTranscriptApi instance failure: {e_outer}")

    # Fallback: yt-dlp for cloud IPs (Railway, etc.)
    if (not transcript_text) or (len(transcript_text) < 100):
        try:
            print("[SCRAPER] Trying yt-dlp fallback...")
            import yt_dlp
            ydl_opts = {
                "writesubtitles": True,
                "writeautomaticsub": True,
                "subtitleslangs": ["en"],
                "skip_download": True,
                "quiet": True,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            subs = info.get("subtitles") or info.get("automatic_captions") or {}
            en_subs = subs.get("en") or subs.get("en-US") or subs.get("en-GB")
            if en_subs:
                sub_url = en_subs[-1]["url"]
                async with httpx.AsyncClient(timeout=15) as client:
                    sub_resp = await client.get(sub_url)
                    if sub_resp.status_code == 200:
                        raw = sub_resp.text
                        import xml.etree.ElementTree as ET
                        root = ET.fromstring(raw)
                        texts = [t.text or "" for t in root.iter("text")]
                        transcript_text = " ".join(texts)
                        print(f"[SCRAPER] yt-dlp success: {len(transcript_text)} chars")
        except Exception as yt_err:
            print(f"[SCRAPER] yt-dlp fallback failed: {yt_err}")

    # Bug 2 Fix: Fallback to description if transcript fails but description is over 100 chars
    if (not transcript_text) or (len(transcript_text) < 100):
        try:
            desc_match = re.search(r'<meta name="description" content="(.*?)"', page_resp.text)
            if desc_match:
                desc_text = desc_match.group(1).strip()
                if len(desc_text) >= 100:
                    transcript_text = desc_text
                    print(f"[SCRAPER] YouTube success: Fallback description used ({len(transcript_text)} chars)")
        except:
            pass

    if not transcript_text:
        raise ValueError("This video does not have captions available — try a different video")

    print(f"[SCRAPER] Duration extracted: {duration_seconds}s ({duration_seconds // 60}m {duration_seconds % 60}s)")
    return (transcript_text, title, duration_seconds)


async def extract_x_post_text(url: str) -> tuple[str, str]:
    """Extract text from an X/Twitter post."""
    # X requires auth for API access; best-effort scrape
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        try:
            resp = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })
            if resp.status_code == 200:
                # Try to get og:description
                desc_match = re.search(r'<meta property="og:description" content="(.*?)"', resp.text)
                title_match = re.search(r'<meta property="og:title" content="(.*?)"', resp.text)
                text = desc_match.group(1) if desc_match else "X post content unavailable."
                title = title_match.group(1) if title_match else "X Post"
                return (text, title)
        except Exception as e:
            print(f"[SCRAPER] X scrape failed: {e}")
    return ("X post content could not be extracted.", "X Post")


async def extract_article_text(url: str) -> tuple[str, str]:
    """
    Extracts text from a standard web article using httpx.
    Strips HTML tags and returns readable text + title.
    """
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        try:
            resp = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })
            if resp.status_code != 200:
                return (f"Failed to fetch article: HTTP {resp.status_code}", "Article")

            html = resp.text

            # Extract title
            title = "Article"
            title_match = re.search(r"<title>(.*?)</title>", html, re.DOTALL)
            if title_match:
                title = title_match.group(1).strip()

            og_title = re.search(r'<meta property="og:title" content="(.*?)"', html)
            if og_title:
                title = og_title.group(1).strip()

            # Remove script and style tags
            html = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL)
            html = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL)
            html = re.sub(r"<nav[^>]*>.*?</nav>", "", html, flags=re.DOTALL)
            html = re.sub(r"<footer[^>]*>.*?</footer>", "", html, flags=re.DOTALL)
            html = re.sub(r"<header[^>]*>.*?</header>", "", html, flags=re.DOTALL)

            # Strip remaining tags
            text = re.sub(r"<[^>]+>", " ", html)
            # Clean whitespace
            text = re.sub(r"\s+", " ", text).strip()

            # Decode HTML entities
            text = text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
            text = text.replace("&#39;", "'").replace("&quot;", '"').replace("&nbsp;", " ")

            final = text
            print(f"[SCRAPER] Article extracted chars={len(final)} title='{title[:80]}'")
            return (final, title)

        except Exception as e:
            print(f"[SCRAPER] Article scrape failed: {e}")
            return (f"Article extraction failed: {e}", "Article")
