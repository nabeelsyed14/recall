from pydantic import BaseModel, HttpUrl
from typing import Optional, Any


# --- Ingest ---
class IngestRequest(BaseModel):
    url: HttpUrl

class IngestResponse(BaseModel):
    status: str
    message: str
    content_id: Optional[int] = None
    title: Optional[str] = None
    topic_name: Optional[str] = None


# --- Content Detail ---
class ContentDetailResponse(BaseModel):
    id: int
    title: str
    source_url: str
    summary: str = ""
    key_insights: list[str] = []
    card_count: int
    date_saved: str
    word_count: int = 0
    time_estimate: str = ""


# --- Library ---
class ContentLibraryItem(BaseModel):
    id: int
    title: str
    url: str
    source_type: str
    date_saved: str
    topic_name: str
    genre: str = ""
    card_count: int
    accuracy: Optional[int] = None
    time_estimate: str = ""

class TopicCluster(BaseModel):
    name: str
    items: list[ContentLibraryItem]


# --- Dashboard / Home ---
class NoteResponse(BaseModel):
    id: int
    title: Optional[str] = None
    body: str
    created_at: str

class HomeResponse(BaseModel):
    items_saved: int
    accuracy_percentage: Optional[int] = None
    this_week: list[ContentLibraryItem]
    recent_notes: list[NoteResponse]
    streak_data: Optional[list[str]] = None

class TopicStatItem(BaseModel):
    name: str
    count: int

# --- Quiz ---
class QuizRecordRequest(BaseModel):
    question_id: int
    was_correct: bool

class QuizQuestionResponse(BaseModel):
    id: int
    question: str
    answer: str
    distractor_options: list[str]


# --- Notes ---
class NoteCreateRequest(BaseModel):
    title: Optional[str] = None
    body: str

class NoteUpdateRequest(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None


# --- Auth ---
class AuthRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    onboarding_complete: bool = False


# --- Search ---
class SearchResultItem(BaseModel):
    id: int
    title: str
    url: str
    source_type: str
    date_saved: str
    topic_name: str
    genre: str
    snippet: str = ""


# --- Highlights ---
class HighlightCreateRequest(BaseModel):
    text: str
    source: str = "summary"

class HighlightResponse(BaseModel):
    id: int
    content_id: int
    text: str
    source: str
    created_at: str
    content_title: str = ""

class AllHighlightsResponse(BaseModel):
    content_id: int
    content_title: str
    highlights: list[HighlightResponse]
