-- Migration 015: Add raw_ai_response column to news_intelligence
-- Stores the raw OpenRouter response text for debugging confluence analysis.

ALTER TABLE news_intelligence
  ADD COLUMN IF NOT EXISTS raw_ai_response TEXT;
