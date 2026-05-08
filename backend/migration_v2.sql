-- Recall V2 Migration Script
-- Run this in the Supabase SQL Editor

-- 1. Add multi-mode columns to the questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS key_insights TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS distractor_options TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS conversational_prompt TEXT;

-- 2. Create user_streaks table
CREATE TABLE IF NOT EXISTS user_streaks (
    user_id TEXT PRIMARY KEY REFERENCES profiles(id),
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_review_date TIMESTAMPTZ
);

-- 3. Add summary and key_insights to content table
ALTER TABLE content ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE content ADD COLUMN IF NOT EXISTS key_insights TEXT;
