-- Migration v2: Full schema setup for Vela by Lucent AI
-- Paste this entire script into your Supabase SQL Editor and click Run.

-- =============================================
-- STEP 1: Create all tables (safe - IF NOT EXISTS)
-- =============================================

CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'client' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  industry TEXT NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL,
  vapi_assistant_id TEXT,
  vapi_voice_id TEXT,
  vapi_voice_name TEXT,
  twilio_phone_number TEXT,
  system_prompt TEXT,
  first_message TEXT,
  talktime_minutes_total INTEGER DEFAULT 5000 NOT NULL,
  talktime_minutes_used INTEGER DEFAULT 0 NOT NULL,
  active_lines INTEGER DEFAULT 5 NOT NULL,
  calling_hours_start TEXT DEFAULT '09:00' NOT NULL,
  calling_hours_end TEXT DEFAULT '18:00' NOT NULL,
  timezone TEXT DEFAULT 'America/New_York (EST)' NOT NULL,
  auto_followup_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  followup_delay_hours INTEGER DEFAULT 12 NOT NULL,
  subscription_plan TEXT DEFAULT 'starter' NOT NULL,
  stripe_customer_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS talktime_requests (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  minutes_requested INTEGER NOT NULL,
  amount_due INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  industry TEXT,
  status TEXT DEFAULT 'pending_configuration' NOT NULL,
  meeting_requested BOOLEAN DEFAULT FALSE NOT NULL,
  meeting_time TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_logs (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  lead_name TEXT NOT NULL,
  lead_phone TEXT NOT NULL,
  lead_company TEXT,
  call_duration_seconds INTEGER DEFAULT 0 NOT NULL,
  disposition TEXT DEFAULT 'completed' NOT NULL,
  sentiment TEXT DEFAULT 'positive' NOT NULL,
  conversion_chance INTEGER DEFAULT 0,
  ai_conclusion TEXT,
  transcript TEXT,
  followup_draft TEXT,
  recording_url TEXT,
  scheduled_callback TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  contact_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  industry TEXT,
  preferred_time TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- STEP 2: Add any missing columns to existing tables
-- (safe to run even if columns already exist)
-- =============================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS industry TEXT;

ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS conversion_chance INTEGER DEFAULT 0;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS ai_conclusion TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS followup_draft TEXT;
