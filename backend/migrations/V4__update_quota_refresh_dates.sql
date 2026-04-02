-- V4__update_quota_refresh_dates.sql

-- This migration updates the schema for handling specified-date quota refreshes.
-- It renames the existing 'quota_refresh_date' to 'quota_refresh_end_date' for clarity
-- and adds a new 'quota_refresh_start_date' to allow defining a specific time window.

-- Update scheme_rewards table
ALTER TABLE public.scheme_rewards
RENAME COLUMN IF EXISTS quota_refresh_date TO quota_refresh_end_date;

ALTER TABLE public.scheme_rewards
ADD COLUMN IF NOT EXISTS quota_refresh_start_date DATE;

COMMENT ON COLUMN public.scheme_rewards.quota_refresh_start_date IS '額度計算的指定開始日期 (當類型為 date)';
COMMENT ON COLUMN public.scheme_rewards.quota_refresh_end_date IS '額度計算的指定結束日期 (當類型為 date)';


-- Update payment_method_rewards table
ALTER TABLE public.payment_rewards
RENAME COLUMN IF EXISTS quota_refresh_date TO quota_refresh_end_date;

ALTER TABLE public.payment_rewards
ADD COLUMN IF NOT EXISTS quota_refresh_start_date DATE;

COMMENT ON COLUMN public.payment_rewards.quota_refresh_start_date IS '額度計算的指定開始日期 (當類型為 date)';
COMMENT ON COLUMN public.payment_rewards.quota_refresh_end_date IS '額度計算的指定結束日期 (當類型為 date)';
