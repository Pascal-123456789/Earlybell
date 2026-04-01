-- Migration 014: Add confluence analysis columns to news_intelligence
-- These columns store the new Signal × Catalyst Confluence analysis fields.

ALTER TABLE news_intelligence
  ADD COLUMN IF NOT EXISTS confluences JSONB,
  ADD COLUMN IF NOT EXISTS sector_rotation JSONB,
  ADD COLUMN IF NOT EXISTS watchlist_flags JSONB;
