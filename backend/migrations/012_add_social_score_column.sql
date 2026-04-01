-- Ensure social_score exists as an explicit column on meme_alerts.
-- The original table may have been created without it, causing null values
-- and PGRST204 errors on upsert.
ALTER TABLE meme_alerts
  ADD COLUMN IF NOT EXISTS social_score FLOAT DEFAULT 0;
