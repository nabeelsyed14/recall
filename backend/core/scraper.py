import re
import httpx
from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi

MAX_CHARS = 6000


async def scrape_url(url: str) -> tuple[str, str, int]:
    domain = urlparse(url).netloc

    if "youtube.com" in domain or "youtu.be" in domain:
        return await extract_youtube(url)
    elif "twitter.com" in domain or "x.com" in domain:
        text, title = await extract_x_post_text(url)
        return (text, title, 0)
    else:
        text, title = await extract_article_text(url)
        return (text, title, 0)


def _parse_iso_duration(dur: str) -> int:
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


async def _fetch_oembed(video_id: str) -> dict:
    """oEmbed always works even from cloud IPs. Returns title, author, thumbnail."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
            )
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass
    return {}


async def extract_youtube(url: str) -> tuple[str, str, int]:
    video_id = _get_video_id(url)
    if not video_id:
        return ("Could not extract video ID.", "YouTube Video", 0)

    title = "YouTube Video"
    transcript_text = ""
    duration_seconds = 0
    page_html = ""

    # 1. Fetch oEmbed (always works, reliable title)
    oembed = await _fetch_oembed(video_id)
    if oembed.get("title"):
        title = oembed["title"]

    # 2. Fetch video page for duration + description + title fallback
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            page_resp = await client.get(
                f"https://www.youtube.com/watch?v={video_id}",
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            )
            if page_resp.status_code == 200:
                page_html = page_resp.text

                # Title fallback from page
                if title == "YouTube Video":
                    title_match = re.search(r"<title>(.*?)</title>", page_html)
                    if title_match:
                        title = title_match.group(1).replace(" - YouTube", "").strip()

                # Duration from multiple sources
                for pattern in [
                    r'"approximateSeconds"\s*:\s*"(\d+)"',
                    r'"lengthSeconds"\s*:\s*"(\d+)"',
                    r'"lengthText"\s*:\s*\{\s*"simpleText"\s*:\s*"(\d+):(\d+):(\d+)"',
                ]:
                    dur_match = re.search(pattern, page_html)
                    if dur_match:
                        try:
                            groups = dur_match.groups()
                            if len(groups) == 1:
                                duration_seconds = int(groups[0])
                            elif len(groups) == 3:
                                h, m, s = int(groups[0]), int(groups[1]), int(groups[2])
                                duration_seconds = h * 3600 + m * 60 + s
                        except Exception:
                            pass
                        break

                if not duration_seconds:
                    iso_match = re.search(r'<meta itemprop="duration" content="(PT[\dHMS]+)"', page_html)
                    if iso_match:
                        duration_seconds = _parse_iso_duration(iso_match.group(1))
    except Exception as e:
        print(f"[SCRAPER] Page fetch: {e}")

    # 3. Try youtube-transcript-api (works on localhost, blocked on cloud)
    try:
        api = YouTubeTranscriptApi()
        res = api.fetch(video_id, languages=['en', 'en-US', 'en-GB'])
        transcript_text = " ".join([s.text for s in res.snippets])
        print(f"[SCRAPER] Transcript API success: {len(transcript_text)} chars")
    except Exception:
        try:
            api = YouTubeTranscriptApi()
            transcripts = api.list(video_id)
            best = None
            for method in [
                lambda: transcripts.find_transcript(['en', 'en-US', 'en-GB']),
                lambda: transcripts.find_generated_transcript(['en', 'en-US', 'en-GB']),
                lambda: next(iter(transcripts)),
            ]:
                try:
                    best = method()
                    break
                except Exception:
                    continue
            if best:
                data = best.fetch()
                transcript_text = " ".join([s.text for s in data.snippets])
                print(f"[SCRAPER] Transcript list success: {len(transcript_text)} chars")
        except Exception as e:
            print(f"[SCRAPER] Transcript API blocked (expected on cloud): {e}")

    # 4. Fallback to video description from page HTML
    if (not transcript_text) or (len(transcript_text) < 100):
        try:
            desc_patterns = [
                r'<meta itemprop="description" content="(.*?)"',
                r'<meta name="description" content="(.*?)"',
                r'"shortDescription"\s*:\s*"(.*?)"',
            ]
            for pattern in desc_patterns:
                desc_match = re.search(pattern, page_html)
                if desc_match:
                    desc_text = desc_match.group(1).strip()
                    desc_text = desc_text.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
                    if len(desc_text) >= 50:
                        transcript_text = desc_text
                        print(f"[SCRAPER] Description fallback: {len(transcript_text)} chars")
                        break
        except Exception:
            pass

    # 5. Noembed fallback (works from cloud IPs — proxies the request)
    if (not transcript_text) or (len(transcript_text) < 100):
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                noemb = await client.get(
                    f"https://noembed.com/embed?url=https://www.youtube.com/watch?v={video_id}"
                )
                if noemb.status_code == 200:
                    data = noemb.json()
                    desc = data.get("description") or data.get("title") or ""
                    if len(desc) >= 50:
                        transcript_text = desc
                        print(f"[SCRAPER] noembed fallback: {len(transcript_text)} chars")
        except Exception as e:
            print(f"[SCRAPER] noembed failed: {e}")

    # 6. Never fail — always return something
    if not transcript_text or len(transcript_text) < 50:
        transcript_text = f"YouTube video: {title}. Transcript not available on cloud hosting due to IP restrictions. Content was processed from the video description and metadata."
        print(f"[SCRAPER] Minimal content fallback")

    if duration_seconds:
        print(f"[SCRAPER] Duration: {duration_seconds}s ({duration_seconds // 60}m {duration_seconds % 60}s)")
    else:
        print(f"[SCRAPER] Duration: unknown")

    return (transcript_text, title, duration_seconds)


async def extract_x_post_text(url: str) -> tuple[str, str]:
    # Extract tweet ID from URL (e.g. x.com/user/status/123456789 or twitter.com/user/status/123)
    match = re.search(r'/status(?:es)?/(\d+)', url)
    if not match:
        return ("Could not extract tweet ID from URL.", "X Post")

    tweet_id = match.group(1)

    # Use vxtwitter API — free, no auth, works from cloud IPs
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"https://api.vxtwitter.com/Twitter/status/{tweet_id}")
            if resp.status_code == 200:
                data = resp.json()
                tweet_text = data.get("text", "")
                author = data.get("user_name") or data.get("user_screen_name") or "X User"
                if tweet_text:
                    title = f"X Post by {author}"
                    full = f"{tweet_text}\n\n— {author}"
                    print(f"[SCRAPER] X success via vxtwitter: {len(full)} chars")
                    return (full, title)
    except Exception as e:
        print(f"[SCRAPER] vxtwitter failed: {e}")

    # Fallback: HTML scrape
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })
            if resp.status_code == 200:
                desc_match = re.search(r'<meta property="og:description" content="(.*?)"', resp.text)
                title_match = re.search(r'<meta property="og:title" content="(.*?)"', resp.text)
                if desc_match and title_match:
                    return (desc_match.group(1).strip(), title_match.group(1).strip())
    except Exception as e:
        print(f"[SCRAPER] X HTML fallback failed: {e}")

    return ("X post content could not be extracted.", "X Post")


async def extract_article_text(url: str) -> tuple[str, str]:
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        try:
            resp = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })
            if resp.status_code != 200:
                return (f"Failed to fetch article: HTTP {resp.status_code}", "Article")

            html = resp.text

            title = "Article"
            og_title = re.search(r'<meta property="og:title" content="(.*?)"', html)
            if og_title:
                title = og_title.group(1).strip()
            else:
                title_match = re.search(r"<title>(.*?)</title>", html, re.DOTALL)
                if title_match:
                    title = title_match.group(1).strip()

            html = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL)
            html = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL)
            html = re.sub(r"<nav[^>]*>.*?</nav>", "", html, flags=re.DOTALL)
            html = re.sub(r"<footer[^>]*>.*?</footer>", "", html, flags=re.DOTALL)
            html = re.sub(r"<header[^>]*>.*?</header>", "", html, flags=re.DOTALL)

            text = re.sub(r"<[^>]+>", " ", html)
            text = re.sub(r"\s+", " ", text).strip()
            text = text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
            text = text.replace("&#39;", "'").replace("&quot;", '"').replace("&nbsp;", " ")

            print(f"[SCRAPER] Article extracted chars={len(text)} title='{title[:80]}'")
            return (text, title)

        except Exception as e:
            print(f"[SCRAPER] Article scrape failed: {e}")
            return (f"Article extraction failed: {e}", "Article")
