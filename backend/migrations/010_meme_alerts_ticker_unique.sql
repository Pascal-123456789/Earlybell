-- Ensure ticker is a unique constraint on meme_alerts so that
-- upsert with on_conflict='ticker' correctly updates existing rows
-- rather than silently inserting duplicates.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'meme_alerts'::regclass
      AND contype = 'u'
      AND conname = 'meme_alerts_ticker_key'
  ) THEN
    ALTER TABLE meme_alerts ADD CONSTRAINT meme_alerts_ticker_key UNIQUE (ticker);
  END IF;
END
$$;
