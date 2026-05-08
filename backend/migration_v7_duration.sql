-- Migration V7: Video duration for accurate time estimates
ALTER TABLE content ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;
