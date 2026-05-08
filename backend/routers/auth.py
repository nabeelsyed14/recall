from fastapi import APIRouter, HTTPException, status
from schemas.schemas import AuthRequest, AuthResponse
from core.supabase import SupabaseError, fetch_user, insert_profile, login, signup
import traceback

router = APIRouter(prefix="/api/auth", tags=["auth"])


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
        return AuthResponse(access_token=access_token, user_id=user_id, email=email)
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
        return AuthResponse(access_token=access_token, user_id=user_id, email=email)
    except SupabaseError as e:
        print(f"[AUTH LOGIN ERROR] {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        print(f"[AUTH LOGIN UNHANDLED] {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Login failed: {e}")
