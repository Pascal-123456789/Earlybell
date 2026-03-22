-- Add earnings calendar columns to meme_alerts
ALTER TABLE meme_alerts
  ADD COLUMN IF NOT EXISTS earnings_date TEXT,
  ADD COLUMN IF NOT EXISTS earnings_time TEXT;
