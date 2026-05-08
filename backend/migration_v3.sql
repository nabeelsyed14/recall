-- Migration V3: Pivot to Personal Knowledge Hub
-- Run this in the Supabase SQL Editor or provide DATABASE_URL to run via script

-- 1. Create notes table
CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT,
    body TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create quiz_records table
CREATE TABLE IF NOT EXISTS quiz_records (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    was_correct BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Fix ON DELETE CASCADE for content -> questions and review_cards
-- Drop existing constraints (names may vary slightly, we will try to handle standard names)
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_content_id_fkey;
ALTER TABLE questions ADD CONSTRAINT questions_content_id_fkey 
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE;

ALTER TABLE review_cards DROP CONSTRAINT IF EXISTS review_cards_question_id_fkey;
ALTER TABLE review_cards ADD CONSTRAINT review_cards_question_id_fkey 
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;

-- Also cascade topics to content just in case
ALTER TABLE content DROP CONSTRAINT IF EXISTS content_topic_id_fkey;
ALTER TABLE content ADD CONSTRAINT content_topic_id_fkey 
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;
