-- Migration V4: Full-Text Search
-- Run this in the Supabase SQL Editor

-- 1. Add search vector column to content
ALTER TABLE content ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Populate existing rows
UPDATE content SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(summary, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(key_insights, '')), 'C');

-- 3. Trigger to auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION content_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.key_insights, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_content_search ON content;
CREATE TRIGGER trg_content_search
  BEFORE INSERT OR UPDATE ON content
  FOR EACH ROW EXECUTE FUNCTION content_search_update();

-- 4. GIN index for fast FTS queries
CREATE INDEX IF NOT EXISTS idx_content_search ON content USING GIN(search_vector);
