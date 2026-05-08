-- Migration V5: Highlights
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS highlights (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    content_id INTEGER REFERENCES content(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    source TEXT DEFAULT 'summary',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own highlights"
    ON highlights FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can select own highlights"
    ON highlights FOR SELECT
    USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own highlights"
    ON highlights FOR DELETE
    USING (auth.uid()::text = user_id);
