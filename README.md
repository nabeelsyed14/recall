# 🧠 Recall

**Turn anything you consume online into retained, queryable knowledge.**

Recall is a personal knowledge hub. Paste a YouTube video or article link — it pulls the transcript, generates a summary, key insights, quiz questions, and groups everything by genre. Quiz yourself, take notes, save highlights, and chat with your content.

[**Try it live →**](https://recall-eight-self.vercel.app/)

---

## ✨ Features

- **🔗 Smart Ingestion** — Paste any YouTube, article, or X/Twitter link. Transcripts extracted via youtube-transcript-api + vxtwitter API with cloud fallbacks.
- **🤖 AI Processing** — Groq (Llama 3.3 70B) generates a 3-sentence summary, 5 key insights, 6 quiz questions with distractors, and genre classification.
- **📊 Knowledge Graph** — Donut chart showing your library's genre breakdown with percentage stats and custom legend.
- **🧪 Quiz System** — On-demand MCQ quizzes per content or random shuffle across your entire library. Immediate green/red feedback, accuracy tracking saved to the database.
- **📝 Notes** — Full markdown notes editor with lined-paper texture. Create, edit, delete. Markdown rendering when viewing.
- **💡 Highlights** — Select any text in a summary to save it. A floating button appears — click to save. Browse all highlights in one place.
- **💬 Chat with Content** — Ask AI questions about any piece you've saved. Responses stream in token-by-token. 10-message session cap.
- **🔍 Full-Text Search** — Search your entire library by title and content. Debounced input, highlighted matches.
- **📄 PDF Export** — Export any content as a styled PDF with summary, insights, quiz questions, and highlights.
- **⌨️ Keyboard Shortcuts** — `Q` to quiz, `N` new note, `S` focus search, `Esc` dismiss modals, `?` shows cheat sheet.
- **📱 Mobile Responsive** — Adapts to phones and tablets with collapsible sidebar, stacked layouts, and touch-friendly controls.
- **🔐 Auth** — Supabase Auth with JWT bearer tokens, protected routes, RLS policies on every table.

---

## 🏗️ Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite 5, React Router 6, Recharts, React Markdown |
| Backend | Python, FastAPI, Uvicorn |
| Database | Supabase (PostgreSQL) with Row-Level Security |
| AI | Groq API (Llama 3.3 70B) |
| Scraping | youtube-transcript-api v1.2.4, vxtwitter, oEmbed, noembed |
| PDF | fpdf2 |

---

## 🚀 Run Locally

### You'll need
- Python 3.11+
- Node.js 18+
- A Supabase project (free tier works)
- A Groq API key ([console.groq.com](https://console.groq.com))

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # or: source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` in `backend/`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
JWT_SECRET=your-jwt-secret
GROQ_API_KEY=your-groq-key
FRONTEND_URL=http://localhost:3000
```

```bash
python -m uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Or both at once

```bash
python run.py
```

---

## 🗄️ Database

Run these in your Supabase SQL Editor, in order:

1. `migration_v4_search.sql` — full-text search indexes
2. `migration_v5_highlights.sql` — highlights table + RLS
3. `migration_v6_onboarding.sql` — onboarding flag for new users
4. `migration_v7_duration.sql` — video duration tracking
5. `migration_v8_wordcount.sql` — pre-calculated word counts for fast loading

---

## 📁 Structure

```
recall/
├── backend/
│   ├── core/           # AI, scraper, PDF export, Supabase client
│   ├── routers/        # auth, ingest, review, notes
│   ├── schemas/        # Pydantic request/response models
│   ├── main.py         # FastAPI entry point
│   └── Procfile        # process runner
├── frontend/
│   ├── src/
│   │   ├── api/        # fetch wrapper with JWT
│   │   ├── components/ # Layout, modals, chat panel, search bar
│   │   └── pages/      # Dashboard, library, quiz, notes, highlights
│   └── vercel.json     # SPA routing
├── railway.toml
└── run.py              # launches both services
```

---

## 📄 License

MIT
