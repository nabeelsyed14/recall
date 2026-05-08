import asyncio
import json
from datetime import datetime, timezone
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from schemas.schemas import (
    IngestRequest, IngestResponse, ContentDetailResponse,
    HighlightCreateRequest, HighlightResponse,
    AllHighlightsResponse
)
from core.security import get_current_user
from core.scraper import scrape_url
from core.ai import generate_questions_from_text, generate_content_summary, stream_chat_response
from core.supabase import SupabaseError, insert_profile, insert_row, select_rows
from core.pdf_export import generate_content_pdf
import httpx
from core.config import settings


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


MAX_CHAT_MESSAGES = 10

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

        cached = await select_rows(token, "content", f"select=id,title,raw_text&source_url=eq.{url}&user_id=eq.{user_id}&limit=1")
        if cached:
            c = cached[0]
            return IngestResponse(status="success", message="Already in your library.", content_id=c["id"], title=c.get("title") or "Untitled", topic_name="")

        raw_text, extracted_title, duration_seconds = await scrape_url(url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        questions_task = generate_questions_from_text(raw_text)
        summary_task = generate_content_summary(raw_text, extracted_title)
        results = await asyncio.gather(questions_task, summary_task, return_exceptions=True)

        questions_raw, content_meta_raw = results

        if isinstance(questions_raw, Exception):
            raise HTTPException(status_code=400, detail=f"Question generation failed: {questions_raw}")
        questions = questions_raw
        if not questions:
            raise HTTPException(status_code=400, detail="AI returned no questions")

        if isinstance(content_meta_raw, Exception):
            content_meta = {"summary": "", "key_insights": [], "genre": "General"}
        else:
            content_meta = content_meta_raw
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"AI processing failed: {e}")

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
                "duration_seconds": duration_seconds,
                "word_count": len(raw_text.split()),
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
            f"select=id,title,source_url,summary,key_insights,created_at,word_count,duration_seconds,"
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

        word_count = c.get("word_count", 0)
        url = c.get("source_url") or ""
        is_video = "youtube.com" in url or "youtu.be" in url
        dur = c.get("duration_seconds", 0)
        if dur and dur > 0:
            time_mins = max(1, round(dur / 60))
            time_est = f"{time_mins} min watch"
        else:
            wpm = 150 if is_video else 200
            time_mins = max(1, round(word_count / wpm)) if word_count > 0 else 1
            time_est = f"~{time_mins} min {'watch' if is_video else 'read'}"

        return ContentDetailResponse(
            id=c["id"],
            title=c.get("title") or "Untitled",
            source_url=url,
            summary=summary,
            key_insights=ki,
            card_count=card_count,
            date_saved=c.get("created_at", "")[:10],
            word_count=word_count,
            time_estimate=time_est,
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


@router.post("/{content_id}/highlights", response_model=HighlightResponse)
async def save_highlight(content_id: int, request: HighlightCreateRequest, user=Depends(get_current_user)):
    token = user["token"]
    user_id = user["user_id"]
    try:
        rows = await insert_row(token, "highlights", {
            "user_id": user_id,
            "content_id": content_id,
            "text": request.text,
            "source": request.source,
        })
        h = rows[0]
        return HighlightResponse(
            id=h["id"],
            content_id=content_id,
            text=h.get("text", ""),
            source=h.get("source", "summary"),
            created_at=h.get("created_at", ""),
        )
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{content_id}/highlights", response_model=list[HighlightResponse])
async def get_content_highlights(content_id: int, user=Depends(get_current_user)):
    token = user["token"]
    user_id = user["user_id"]
    try:
        query = f"select=id,content_id,text,source,created_at&user_id=eq.{user_id}&content_id=eq.{content_id}&order=created_at.desc"
        rows = await select_rows(token, "highlights", query)
        return [
            HighlightResponse(
                id=h["id"],
                content_id=h.get("content_id", content_id),
                text=h.get("text", ""),
                source=h.get("source", "summary"),
                created_at=h.get("created_at", ""),
            )
            for h in rows
        ]
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{content_id}/highlights/{highlight_id}")
async def delete_highlight(content_id: int, highlight_id: int, user=Depends(get_current_user)):
    user_id = user["user_id"]
    token = user["token"]
    try:
        url = f"{settings.SUPABASE_URL}/rest/v1/highlights?id=eq.{highlight_id}&content_id=eq.{content_id}&user_id=eq.{user_id}"
        headers = {
            "apikey": settings.SUPABASE_KEY,
            "Authorization": f"Bearer {token}",
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.delete(url, headers=headers)
        if resp.status_code >= 300:
            raise HTTPException(status_code=500, detail="Failed to delete highlight")
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{content_id}/export")
async def export_content_pdf(content_id: int, user=Depends(get_current_user)):
    token = user["token"]
    user_id = user["user_id"]
    try:
        content_rows = await select_rows(token, "content",
            f"select=id,title,source_url,summary,key_insights&id=eq.{content_id}&user_id=eq.{user_id}")
        if not content_rows:
            raise HTTPException(status_code=404, detail="Content not found")

        question_rows = await select_rows(token, "questions",
            f"select=id,question_text,answer_text,distractor_options&content_id=eq.{content_id}")

        highlight_rows = await select_rows(token, "highlights",
            f"select=text&content_id=eq.{content_id}&user_id=eq.{user_id}&order=created_at.desc")

        pdf_bytes = await generate_content_pdf(content_rows[0], question_rows, highlight_rows)

        return Response(content=pdf_bytes, media_type="application/pdf",
                        headers={"Content-Disposition": f"attachment; filename=recall-content-{content_id}.pdf"})
    except Exception as e:
        import traceback
        print(f"[EXPORT PDF ERROR] {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{content_id}/chat")
async def chat_with_content(content_id: int, request: ChatRequest, user=Depends(get_current_user)):
    token = user["token"]
    user_id = user["user_id"]

    user_msg_count = sum(1 for m in request.history if m.get("role") == "user")
    if user_msg_count >= MAX_CHAT_MESSAGES:
        limit_msg = json.dumps({"content": "You've reached the 10-message limit for this session. Refresh the page to start a new conversation."})
        async def _limit():
            yield f"data: {limit_msg}\n\ndata: [DONE]\n\n"

        return StreamingResponse(_limit(), media_type="text/event-stream")

    try:
        content_rows = await select_rows(token, "content",
            f"select=summary,key_insights&id=eq.{content_id}&user_id=eq.{user_id}")
        if not content_rows:
            raise HTTPException(status_code=404, detail="Content not found")

        c = content_rows[0]
        summary = c.get("summary") or ""
        ki_raw = c.get("key_insights") or "[]"
        if isinstance(ki_raw, str):
            try:
                key_insights = json.loads(ki_raw)
            except Exception:
                key_insights = []
        else:
            key_insights = ki_raw if isinstance(ki_raw, list) else []

        insights_text = "\n".join(f"- {k}" for k in key_insights)

        system_prompt = (
            "You are a helpful, concise tutor discussing content the user has saved in their knowledge hub. "
            f"Context summary: {summary}\n\n"
            f"Key insights:\n{insights_text}\n\n"
            "Answer questions based on this context. If the answer is not in the context, say so honestly. "
            "Keep responses concise (2-4 sentences unless asked for detail)."
        )

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend([{"role": m.get("role", "user"), "content": m.get("content", "")} for m in request.history])
        messages.append({"role": "user", "content": request.message})

        async def _stream():
            async for token in stream_chat_response(messages):
                yield f"data: {json.dumps({'content': token})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(_stream(), media_type="text/event-stream")

    except Exception as e:
        async def _error():
            yield f"data: {json.dumps({'content': f'Error: {str(e)}'})}\n\ndata: [DONE]\n\n"
        return StreamingResponse(_error(), media_type="text/event-stream")
