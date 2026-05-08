import json
from datetime import datetime, timezone
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException
from schemas.schemas import IngestRequest, IngestResponse, ContentDetailResponse
from core.security import get_current_user
from core.scraper import scrape_url
from core.ai import generate_questions_from_text, generate_content_summary
from core.supabase import SupabaseError, insert_profile, insert_row, select_rows
import httpx
from core.config import settings

router = APIRouter(prefix="/api/content", tags=["content"])

def _extract_topic_name(url: str, title: str) -> str:
    host = urlparse(url).netloc.replace("www.", "")
    if "youtube.com" in host or "youtu.be" in host:
        words = title.split()[:5]
        return " ".join(words) if words and title != "YouTube Video" else "YouTube"
    if "x.com" in host or "twitter.com" in host:
        return "X"
    words = title.split()[:4]
    return " ".join(words)[:60] if words else "General"

@router.post("/ingest", response_model=IngestResponse)
async def ingest_content(request: IngestRequest, user=Depends(get_current_user)):
    user_id = user["user_id"]
    email = user.get("email") or ""
    token = user["token"]
    url = str(request.url)
    
    try:
        await insert_profile(token, user_id, email)
        raw_text, extracted_title = await scrape_url(url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        questions = await generate_questions_from_text(raw_text)
        if not questions:
            raise HTTPException(status_code=400, detail="AI returned no questions")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Question generation failed: {e}")

    try:
        content_meta = await generate_content_summary(raw_text, extracted_title)
    except Exception as e:
        content_meta = {"summary": "", "key_insights": [], "genre": "General"}

    try:
        topic_name = _extract_topic_name(url, extracted_title)
        genre = content_meta.get("genre", "General")
        topic_rows = await insert_row(token, "topics", {"name": topic_name, "user_id": user_id, "genre": genre})
        topic_id = topic_rows[0]["id"]

        content_title = extracted_title or questions[0].get("title") or topic_name
        content_rows = await insert_row(
            token,
            "content",
            {
                "user_id": user_id,
                "topic_id": topic_id,
                "source_url": url,
                "title": content_title,
                "raw_text": raw_text,
                "summary": content_meta.get("summary", ""),
                "key_insights": json.dumps(content_meta.get("key_insights", [])),
            },
        )
        content_id = content_rows[0]["id"]

        for q in questions:
            question_rows = await insert_row(
                token,
                "questions",
                {
                    "content_id": content_id,
                    "question_text": q.get("question", ""),
                    "answer_text": q.get("answer", ""),
                    "key_insights": json.dumps(q.get("key_insights", [])),
                    "distractor_options": json.dumps(q.get("distractor_options", [])),
                    "conversational_prompt": q.get("conversational_prompt", ""),
                },
            )
            question_id = question_rows[0]["id"]

            # Kept just for compatibility or simple referencing, no SM-2 fields
            await insert_row(
                token,
                "review_cards",
                {
                    "question_id": question_id,
                    "user_id": user_id
                },
                returning="minimal",
            )
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return IngestResponse(status="success", message="URL ingested.", content_id=content_id, title=content_title, topic_name=topic_name)

@router.get("/{content_id}", response_model=ContentDetailResponse)
async def get_content_detail(content_id: int, user=Depends(get_current_user)):
    token = user["token"]
    user_id = user["user_id"]
    try:
        query = (
            f"select=id,title,source_url,summary,key_insights,created_at,"
            f"questions(id)"
            f"&id=eq.{content_id}&user_id=eq.{user_id}"
        )
        rows = await select_rows(token, "content", query)
        if not rows:
            raise HTTPException(status_code=404, detail="Content not found")
        c = rows[0]

        card_count = len(c.get("questions") or [])
        # Backend fix 1: Null safety and JSON parsing
        summary = c.get("summary") or ""
        ki_raw = c.get("key_insights")
        ki = []
        if ki_raw:
            if isinstance(ki_raw, str):
                try: ki = json.loads(ki_raw)
                except: ki = [ki_raw] if ki_raw.strip() else []
            elif isinstance(ki_raw, list):
                ki = ki_raw

        return ContentDetailResponse(
            id=c["id"],
            title=c.get("title") or "Untitled",
            source_url=c.get("source_url") or "",
            summary=summary,
            key_insights=ki,
            card_count=card_count,
            date_saved=c.get("created_at", "")[:10]
        )
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{content_id}")
async def delete_content(content_id: int, user=Depends(get_current_user)):
    user_id = user["user_id"]
    token = user["token"]
    try:
        url = f"{settings.SUPABASE_URL}/rest/v1/content?id=eq.{content_id}&user_id=eq.{user_id}"
        headers = {
            "apikey": settings.SUPABASE_KEY,
            "Authorization": f"Bearer {token}",
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.delete(url, headers=headers)
        
        # Backend fix 3: Add explicit logging
        print(f"[BACKEND] Delete content_id={content_id} user_id={user_id} status={resp.status_code}")
        
        if resp.status_code >= 300:
            raise HTTPException(status_code=500, detail=f"Failed to delete content: {resp.text}")
        return {"status": "success"}
    except Exception as e:
        print(f"[BACKEND] Delete ERROR content_id={content_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
