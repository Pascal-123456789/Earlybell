-- Add detailed signal breakdown columns to meme_alerts
ALTER TABLE meme_alerts
  ADD COLUMN IF NOT EXISTS options_call_put_ratio FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS options_volume_oi_ratio FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS options_total_call_volume BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS options_total_put_volume BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS volume_ratio_today FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS volume_ratio_5d FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS volume_volatility_ratio FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS volume_avg_30d BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS volume_today BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS social_mentions INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS social_rank INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS social_upvotes INT DEFAULT 0;
