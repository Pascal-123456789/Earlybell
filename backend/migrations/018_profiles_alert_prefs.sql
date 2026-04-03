-- Add alert preferences to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS alert_threshold INT DEFAULT 5;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS alert_email TEXT;
