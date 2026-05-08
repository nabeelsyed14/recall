from fastapi import APIRouter, HTTPException, status, Depends
from schemas.schemas import AuthRequest, AuthResponse
from core.security import get_current_user
from core.supabase import SupabaseError, fetch_user, insert_profile, login, signup, select_rows, update_rows
import traceback

router = APIRouter(prefix="/api/auth", tags=["auth"])


async def _get_onboarding(token: str, user_id: str) -> bool:
    try:
        rows = await select_rows(token, "profiles", f"select=onboarding_complete&id=eq.{user_id}")
        if rows:
            return rows[0].get("onboarding_complete", False)
    except Exception:
        pass
    return False


@router.post("/register", response_model=AuthResponse)
async def register(payload: AuthRequest):
    try:
        result = await signup(payload.email, payload.password)
        access_token = result.get("access_token")
        if not access_token:
            user_obj = result.get("user") or {}
            # If email confirmation is enabled, signup may return no session/token.
            # Return a clear message instead of masking it as login failure.
            raise HTTPException(
                status_code=400,
                detail=f"Registration created for {user_obj.get('email', payload.email)}. Confirm email, then login.",
            )
        user = await fetch_user(access_token)
        user_id = user.get("id")
        email = user.get("email") or payload.email
        if not user_id:
            raise HTTPException(status_code=400, detail="Missing user id in token payload.")
        await insert_profile(access_token, user_id, email)
        onboarding = await _get_onboarding(access_token, user_id)
        return AuthResponse(access_token=access_token, user_id=user_id, email=email, onboarding_complete=onboarding)
    except SupabaseError as e:
        print(f"[AUTH REGISTER ERROR] {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        print(f"[AUTH REGISTER UNHANDLED] {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Register failed: {e}")


@router.post("/login", response_model=AuthResponse)
async def login_route(payload: AuthRequest):
    try:
        result = await login(payload.email, payload.password)
        access_token = result.get("access_token")
        if not access_token:
            raise HTTPException(status_code=401, detail="No access token returned by Supabase.")
        user = await fetch_user(access_token)
        user_id = user.get("id")
        email = user.get("email") or payload.email
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload: missing user id.")
        # Ensure FK target exists for downstream inserts (topics/content/review_cards).
        await insert_profile(access_token, user_id, email)
        onboarding = await _get_onboarding(access_token, user_id)
        return AuthResponse(access_token=access_token, user_id=user_id, email=email, onboarding_complete=onboarding)
    except SupabaseError as e:
        print(f"[AUTH LOGIN ERROR] {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        print(f"[AUTH LOGIN UNHANDLED] {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Login failed: {e}")


@router.post("/onboarding/dismiss")
async def dismiss_onboarding(user=Depends(get_current_user)):
    token = user["token"]
    user_id = user["user_id"]
    try:
        await update_rows(token, "profiles", f"id=eq.{user_id}", {"onboarding_complete": True})
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
