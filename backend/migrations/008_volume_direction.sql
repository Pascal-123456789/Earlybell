-- Add volume direction columns to meme_alerts
ALTER TABLE meme_alerts
  ADD COLUMN IF NOT EXISTS volume_direction TEXT DEFAULT 'NEUTRAL',
  ADD COLUMN IF NOT EXISTS volume_price_change_pct REAL DEFAULT 0;
