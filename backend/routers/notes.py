from fastapi import APIRouter, Depends, HTTPException
from typing import List
from schemas.schemas import NoteResponse, NoteCreateRequest, NoteUpdateRequest
from core.security import get_current_user
from core.supabase import SupabaseError, insert_row, select_rows, update_rows

router = APIRouter(prefix="/api/notes", tags=["notes"])

@router.post("", response_model=NoteResponse)
async def create_note(request: NoteCreateRequest, user=Depends(get_current_user)):
    user_id = user["user_id"]
    token = user["token"]
    
    payload = {
        "user_id": user_id,
        "title": request.title or "",
        "body": request.body
    }
    
    try:
        rows = await insert_row(token, "notes", payload)
        if not rows:
            raise HTTPException(status_code=500, detail="Failed to create note")
        n = rows[0]
        return NoteResponse(
            id=n["id"],
            title=n.get("title"),
            body=n.get("body", ""),
            created_at=n.get("created_at", "")
        )
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=List[NoteResponse])
async def get_notes(user=Depends(get_current_user)):
    user_id = user["user_id"]
    token = user["token"]
    
    try:
        query = f"select=*&user_id=eq.{user_id}&order=created_at.desc"
        rows = await select_rows(token, "notes", query)
        
        return [
            NoteResponse(
                id=n["id"],
                title=n.get("title"),
                body=n.get("body", ""),
                created_at=n.get("created_at", "")
            ) for n in rows
        ]
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(note_id: int, request: NoteUpdateRequest, user=Depends(get_current_user)):
    user_id = user["user_id"]
    token = user["token"]
    
    # First check if note exists and belongs to user
    try:
        existing = await select_rows(token, "notes", f"id=eq.{note_id}&user_id=eq.{user_id}")
        if not existing:
            raise HTTPException(status_code=404, detail="Note not found")
            
        payload = {}
        if request.title is not None:
            payload["title"] = request.title
        if request.body is not None:
            payload["body"] = request.body
            
        rows = await update_rows(token, "notes", f"id=eq.{note_id}", payload)
        if not rows:
            raise HTTPException(status_code=500, detail="Failed to update note")
            
        n = rows[0]
        return NoteResponse(
            id=n["id"],
            title=n.get("title"),
            body=n.get("body", ""),
            created_at=n.get("created_at", "")
        )
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{note_id}")
async def delete_note(note_id: int, user=Depends(get_current_user)):
    user_id = user["user_id"]
    token = user["token"]
    
    try:
        # Supabase Python client using httpx. Delete via REST
        import httpx
        from core.config import settings
        url = f"{settings.SUPABASE_URL}/rest/v1/notes?id=eq.{note_id}&user_id=eq.{user_id}"
        headers = {
            "apikey": settings.SUPABASE_KEY,
            "Authorization": f"Bearer {token}",
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.delete(url, headers=headers)
            
        if resp.status_code >= 300:
            raise HTTPException(status_code=500, detail="Failed to delete note")
            
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
