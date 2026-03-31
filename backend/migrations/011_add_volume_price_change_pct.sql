-- Add volume direction columns missing from live meme_alerts schema.
-- migration 008 defined these but was never applied to the production DB,
-- causing PGRST204 errors on upsert.
ALTER TABLE meme_alerts
  ADD COLUMN IF NOT EXISTS volume_direction TEXT DEFAULT 'NEUTRAL',
  ADD COLUMN IF NOT EXISTS volume_price_change_pct FLOAT DEFAULT 0;
