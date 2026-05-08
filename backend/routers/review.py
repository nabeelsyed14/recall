import json
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from schemas.schemas import (
    TopicCluster,
    ContentLibraryItem,
    HomeResponse,
    NoteResponse,
    TopicStatItem,
    QuizRecordRequest,
    QuizQuestionResponse,
    SearchResultItem,
    HighlightResponse,
    AllHighlightsResponse
)
from core.security import get_current_user
from core.supabase import SupabaseError, select_rows, insert_row

router = APIRouter(prefix="/api", tags=["review"])

@router.get("/home", response_model=HomeResponse)
async def get_home(user=Depends(get_current_user)):
    user_id = user["user_id"]
    token = user["token"]
    
    try:
        # 1. Total items saved
        content_rows = await select_rows(token, "content", f"select=id,title,source_url,created_at,word_count,duration_seconds,topics(name,genre)&user_id=eq.{user_id}")
        items_saved = len(content_rows)
        
        # 2. Accuracy percentage
        quiz_rows = await select_rows(token, "quiz_records", f"select=was_correct,created_at&user_id=eq.{user_id}")
        accuracy = None
        if quiz_rows:
            correct = sum(1 for r in quiz_rows if r.get("was_correct"))
            accuracy = int(round((correct / len(quiz_rows)) * 100))
        
        # 2b. Streak data - last 7 days
        now = datetime.now(timezone.utc)
        streak_data = []
        for i in range(6, -1, -1):
            day = (now - timedelta(days=i)).date()
            day_str = day.isoformat()

            has_content = False
            for c in content_rows:
                try:
                    dt = datetime.fromisoformat(c.get("created_at", "").replace("Z", "+00:00"))
                    if dt.date() == day:
                        has_content = True
                        break
                except:
                    pass

            has_quiz = False
            for r in quiz_rows:
                try:
                    dt = datetime.fromisoformat(r.get("created_at", "").replace("Z", "+00:00"))
                    if dt.date() == day:
                        has_quiz = True
                        break
                except:
                    pass

            if has_content or has_quiz:
                streak_data.append(day_str)
            else:
                streak_data.append("")
                
        # 3. This week's content
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)
        this_week = []
        for c in content_rows:
            try:
                dt = datetime.fromisoformat(c["created_at"].replace("Z", "+00:00"))
                if dt >= week_ago:
                    this_week.append(c)
            except:
                pass
                
        # Sort desc
        this_week.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        # Convert to ContentLibraryItem (simplified for dashboard)
        this_week_items = []
        for c in this_week:
            url = c.get("source_url", "")
            source_type = "article"
            is_video = False
            if "youtube.com" in url or "youtu.be" in url:
                source_type = "youtube"
                is_video = True
            elif "twitter.com" in url or "x.com" in url:
                source_type = "x"

            dur = c.get("duration_seconds", 0)
            if dur and dur > 0:
                mins = max(1, round(dur / 60))
                time_est = f"{mins} min watch"
            else:
                wc = c.get("word_count", 0)
                wpm = 150 if is_video else 200
                mins = max(1, round(wc / wpm)) if wc > 0 else 1
                time_est = f"~{mins} min {'watch' if is_video else 'read'}"

            topic = c.get("topics") or {}

            this_week_items.append(ContentLibraryItem(
                id=c["id"],
                title=c.get("title") or "Untitled",
                url=url,
                source_type=source_type,
                date_saved=c.get("created_at", "")[:10],
                topic_name=topic.get("name") or "Uncategorized",
                genre=topic.get("genre") or "General",
                card_count=0,
                time_estimate=time_est,
            ))
            
        # 4. Recent notes (last 2)
        notes_rows = await select_rows(token, "notes", f"select=id,title,body,created_at&user_id=eq.{user_id}&order=created_at.desc&limit=2")
        recent_notes = [
            NoteResponse(
                id=n["id"],
                title=n.get("title"),
                body=n.get("body", ""),
                created_at=n.get("created_at", "")
            ) for n in notes_rows
        ]
        
        return HomeResponse(
            items_saved=items_saved,
            accuracy_percentage=accuracy,
            this_week=this_week_items,
            recent_notes=recent_notes,
            streak_data=streak_data
        )
        
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/library", response_model=list[TopicCluster])
async def get_library(user=Depends(get_current_user)):
    user_id = user["user_id"]
    token = user["token"]
    try:
        query = (
            "select=id,name,genre,"
            "content(id,title,source_url,created_at,word_count,duration_seconds,"
            "questions(id))"
            f"&user_id=eq.{user_id}"
        )
        topics_data = await select_rows(token, "topics", query)

        quiz_rows = await select_rows(token, "quiz_records",
            f"select=question_id,was_correct,questions!inner(content_id)&user_id=eq.{user_id}")
        quiz_by_content = {}
        for r in quiz_rows:
            cid = (r.get("questions") or {}).get("content_id")
            if cid:
                if cid not in quiz_by_content:
                    quiz_by_content[cid] = {"correct": 0, "total": 0}
                quiz_by_content[cid]["total"] += 1
                if r.get("was_correct"):
                    quiz_by_content[cid]["correct"] += 1

        def _time_estimate(word_count, is_video, duration_seconds=0):
            if duration_seconds and duration_seconds > 0:
                mins = max(1, round(duration_seconds / 60))
                return f"{mins} min watch"
            wpm = 150 if is_video else 200
            mins = max(1, round(word_count / wpm))
            label = "watch" if is_video else "read"
            return f"~{mins} min {label}"

        clusters = []
        for t in topics_data:
            items = []
            contents = t.get("content") or []
            for c in contents:
                card_count = 0
                questions = c.get("questions") or []
                if isinstance(questions, dict):
                    questions = [questions]
                card_count = len(questions)

                url = c.get("source_url", "")
                source_type = "article"
                is_video = False
                if "youtube.com" in url or "youtu.be" in url:
                    source_type = "youtube"
                    is_video = True
                elif "twitter.com" in url or "x.com" in url:
                    source_type = "x"

                word_count = c.get("word_count", 0)
                time_est = _time_estimate(word_count, is_video, c.get("duration_seconds", 0))

                qdata = quiz_by_content.get(c["id"])
                accuracy = int(round((qdata["correct"] / qdata["total"]) * 100)) if qdata and qdata["total"] > 0 else None

                items.append(
                    ContentLibraryItem(
                        id=c["id"],
                        title=c.get("title") or "Untitled",
                        url=url,
                        source_type=source_type,
                        date_saved=c.get("created_at", "")[:10],
                        topic_name=t.get("name") or "Uncategorized",
                        genre=t.get("genre") or "General",
                        card_count=card_count,
                        accuracy=accuracy,
                        time_estimate=time_est,
                    )
                )

            if items:
                clusters.append(
                    TopicCluster(
                        name=t.get("name") or "Uncategorized",
                        items=items
                    )
                )
        return clusters
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/topics", response_model=list[TopicStatItem])
async def get_topic_stats(user=Depends(get_current_user)):
    user_id = user["user_id"]
    token = user["token"]
    try:
        query = "select=id,name,genre,content(id)&user_id=eq." + user_id
        topics_data = await select_rows(token, "topics", query)
        
        # Group by genre
        genre_map = {}
        for t in topics_data:
            contents = t.get("content") or []
            if not contents:
                continue
            
            genre = t.get("genre")
            name = t.get("name") or "Uncategorized"
            
            # Simple keyword-based fallback if genre is null
            if not genre:
                lower_name = name.lower()
                if any(k in lower_name for k in ['tech', 'software', 'ai', 'code', 'dev']): genre = 'Technology'
                elif any(k in lower_name for k in ['game', 'play', 'xbox', 'ps5', 'gaming']): genre = 'Gaming'
                elif any(k in lower_name for k in ['money', 'finance', 'stock', 'invest']): genre = 'Finance'
                elif any(k in lower_name for k in ['science', 'space', 'biology', 'physics']): genre = 'Science'
                elif any(k in lower_name for k in ['history', 'ancient', 'war', 'century']): genre = 'History'
                elif any(k in lower_name for k in ['health', 'fit', 'medical', 'doctor']): genre = 'Health'
                elif any(k in lower_name for k in ['prod', 'focus', 'habit', 'work']): genre = 'Productivity'
                elif any(k in lower_name for k in ['edu', 'learn', 'teach', 'school']): genre = 'Education'
                elif any(k in lower_name for k in ['movie', 'music', 'ent', 'show']): genre = 'Entertainment'
                elif any(k in lower_name for k in ['politic', 'gov', 'vote', 'news']): genre = 'Politics'
                elif any(k in lower_name for k in ['culture', 'social', 'society']): genre = 'Culture'
                elif any(k in lower_name for k in ['biz', 'startup', 'market']): genre = 'Business'
                else: genre = 'Uncategorized'
            
            if genre in genre_map:
                genre_map[genre] += len(contents)
            else:
                genre_map[genre] = len(contents)
        
        stats = [TopicStatItem(name=k, count=v) for k, v in genre_map.items()]
        return stats
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/content/{content_id}/questions", response_model=list[QuizQuestionResponse])
async def get_content_questions(content_id: int, user=Depends(get_current_user)):
    # user_id = user["user_id"]
    token = user["token"]
    try:
        query = f"select=id,question_text,answer_text,distractor_options&content_id=eq.{content_id}"
        rows = await select_rows(token, "questions", query)
        
        questions = []
        for r in rows:
            distractors = []
            raw_dist = r.get("distractor_options", "[]")
            if isinstance(raw_dist, str):
                try:
                    distractors = json.loads(raw_dist)
                except:
                    pass
            elif isinstance(raw_dist, list):
                distractors = raw_dist
                
            questions.append(QuizQuestionResponse(
                id=r["id"],
                question=r.get("question_text", ""),
                answer=r.get("answer_text", ""),
                distractor_options=distractors
            ))
        return questions
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/review/record")
async def record_quiz(request: QuizRecordRequest, user=Depends(get_current_user)):
    user_id = user["user_id"]
    token = user["token"]
    
    payload = {
        "user_id": user_id,
        "question_id": request.question_id,
        "was_correct": request.was_correct
    }
    
    try:
        print(f"[QUIZ RECORD] Recording: user_id={user_id}, question_id={request.question_id}, was_correct={request.was_correct}")
        result = await insert_row(token, "quiz_records", payload, returning="minimal")
        print(f"[QUIZ RECORD] Success: {result}")
        return {"status": "success"}
    except SupabaseError as e:
        print(f"[QUIZ RECORD] Failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/content/{content_id}/related")
async def get_related_content(content_id: int, user=Depends(get_current_user)):
    user_id = user["user_id"]
    token = user["token"]
    
    try:
        # Get the topic_id for this content
        content_query = f"select=topic_id&user_id=eq.{user_id}&id=eq.{content_id}"
        content_rows = await select_rows(token, "content", content_query)
        if not content_rows:
            return []
        
        topic_id = content_rows[0].get("topic_id")
        
        # Get other content in same topic
        related_query = f"select=id,title,created_at&topic_id=eq.{topic_id}&user_id=eq.{user_id}&id=neq.{content_id}&order=created_at.desc&limit=3"
        related_rows = await select_rows(token, "content", related_query)
        
        return [
            {
                "id": r["id"],
                "title": r.get("title") or "Untitled",
                "date_saved": r.get("created_at", "")[:10]
            }
            for r in related_rows
        ]
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search", response_model=list[SearchResultItem])
async def search_content(q: str, user=Depends(get_current_user)):
    user_id = user["user_id"]
    token = user["token"]

    try:
        query = (
            f"select=id,title,source_url,created_at,summary,topics!inner(name,genre)"
            f"&user_id=eq.{user_id}"
            f"&search_vector=plfts.{q}"
            f"&limit=20"
        )
        rows = await select_rows(token, "content", query)
    except SupabaseError:
        try:
            query = (
                f"select=id,title,source_url,created_at,summary,topics!inner(name,genre)"
                f"&user_id=eq.{user_id}"
                f"&or=(title.ilike.*{q}*,summary.ilike.*{q}*)"
                f"&limit=20"
            )
            rows = await select_rows(token, "content", query)
        except SupabaseError as e:
            raise HTTPException(status_code=500, detail=str(e))

    results = []
    for r in rows:
        url = r.get("source_url", "")
        source_type = "article"
        if "youtube.com" in url or "youtu.be" in url:
            source_type = "youtube"
        elif "twitter.com" in url or "x.com" in url:
            source_type = "x"

        topic = r.get("topics") or {}
        summary = r.get("summary") or ""
        snippet = summary[:200] if summary else ""

        results.append(SearchResultItem(
            id=r["id"],
            title=r.get("title") or "Untitled",
            url=url,
            source_type=source_type,
            date_saved=r.get("created_at", "")[:10],
            topic_name=topic.get("name") or "Uncategorized",
            genre=topic.get("genre") or "General",
            snippet=snippet,
        ))
    return results


@router.get("/highlights", response_model=list[AllHighlightsResponse])
async def get_all_highlights(user=Depends(get_current_user)):
    user_id = user["user_id"]
    token = user["token"]
    try:
        query = (
            f"select=id,content_id,text,source,created_at,"
            f"content!inner(id,title)"
            f"&user_id=eq.{user_id}&order=created_at.desc"
        )
        rows = await select_rows(token, "highlights", query)

        grouped = {}
        for h in rows:
            content = h.get("content") or {}
            cid = content.get("id")
            if cid not in grouped:
                grouped[cid] = {
                    "content_id": cid,
                    "content_title": content.get("title") or "Untitled",
                    "highlights": [],
                }
            grouped[cid]["highlights"].append(HighlightResponse(
                id=h["id"],
                content_id=cid,
                text=h.get("text", ""),
                source=h.get("source", "summary"),
                created_at=h.get("created_at", ""),
                content_title=content.get("title") or "Untitled",
            ))

        return list(grouped.values())
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))
