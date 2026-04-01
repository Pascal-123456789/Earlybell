CREATE TABLE IF NOT EXISTS news_intelligence (
  id SERIAL PRIMARY KEY,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  macro_summary TEXT,
  macro_themes JSONB,
  sector_impacts JSONB,
  ticker_impacts JSONB,
  overall_sentiment TEXT,
  headline_count INT,
  headlines JSONB
);

CREATE INDEX IF NOT EXISTS idx_news_intelligence_recorded_at ON news_intelligence (recorded_at DESC);
