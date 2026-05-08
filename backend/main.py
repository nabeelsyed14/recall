from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, ingest, review, notes

app = FastAPI(title="Recall API", description="Personal Knowledge Hub API")

# Configure CORS
import os
FRONTEND_URL = os.environ.get("FRONTEND_URL", "")
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
]
if FRONTEND_URL:
    origins.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Recall API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

app.include_router(ingest.router)
app.include_router(review.router)
app.include_router(notes.router)
app.include_router(auth.router)
