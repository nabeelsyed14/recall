import json
from typing import Any
import httpx
from core.config import settings


class SupabaseError(RuntimeError):
    pass


def _base_headers(access_token: str | None = None) -> dict[str, str]:
    headers = {
        "apikey": settings.SUPABASE_KEY,
        "Content-Type": "application/json",
    }
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    return headers


async def fetch_user(access_token: str) -> dict[str, Any]:
    url = f"{settings.SUPABASE_URL}/auth/v1/user"
    headers = _base_headers(access_token)
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, headers=headers)
    if resp.status_code >= 300:
        raise SupabaseError(f"user fetch failed: {resp.status_code} {resp.text}")
    return resp.json()


async def signup(email: str, password: str) -> dict[str, Any]:
    url = f"{settings.SUPABASE_URL}/auth/v1/signup"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, headers=_base_headers(), json={"email": email, "password": password})
    if resp.status_code >= 300:
        raise SupabaseError(f"signup failed: {resp.status_code} {resp.text}")
    return resp.json()


async def login(email: str, password: str) -> dict[str, Any]:
    url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, headers=_base_headers(), json={"email": email, "password": password})
    if resp.status_code >= 300:
        raise SupabaseError(f"login failed: {resp.status_code} {resp.text}")
    return resp.json()


async def insert_profile(access_token: str, user_id: str, email: str) -> None:
    url = f"{settings.SUPABASE_URL}/rest/v1/profiles"
    payload = {"id": user_id, "email": email}
    headers = _base_headers(access_token)
    headers["Prefer"] = "resolution=merge-duplicates"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, headers=headers, content=json.dumps(payload))
    if resp.status_code >= 300:
        raise SupabaseError(f"profile insert failed: {resp.status_code} {resp.text}")


async def insert_row(access_token: str, table: str, payload: dict[str, Any], returning: str = "representation") -> list[dict[str, Any]]:
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}"
    headers = _base_headers(access_token)
    headers["Prefer"] = f"return={returning}"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, headers=headers, content=json.dumps(payload))
    if resp.status_code >= 300:
        raise SupabaseError(f"{table} insert failed: {resp.status_code} {resp.text}")
    if not resp.text.strip():
        return []
    data = resp.json()
    return data if isinstance(data, list) else [data]


async def select_rows(access_token: str, table: str, query: str) -> list[dict[str, Any]]:
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}?{query}"
    headers = _base_headers(access_token)
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, headers=headers)
    if resp.status_code >= 300:
        raise SupabaseError(f"{table} select failed: {resp.status_code} {resp.text}")
    data = resp.json()
    return data if isinstance(data, list) else [data]


async def update_rows(access_token: str, table: str, filters: str, payload: dict[str, Any]) -> list[dict[str, Any]]:
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}?{filters}"
    headers = _base_headers(access_token)
    headers["Prefer"] = "return=representation"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.patch(url, headers=headers, content=json.dumps(payload))
    if resp.status_code >= 300:
        raise SupabaseError(f"{table} update failed: {resp.status_code} {resp.text}")
    if not resp.text.strip():
        return []
    data = resp.json()
    return data if isinstance(data, list) else [data]
