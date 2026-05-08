-- Migration V8: Pre-calculated word count for speed
ALTER TABLE content ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0;

-- Backfill existing rows
UPDATE content SET word_count = array_length(regexp_split_to_array(COALESCE(raw_text, ''), '\s+'), 1) WHERE word_count = 0 AND raw_text IS NOT NULL;
