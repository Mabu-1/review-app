-- Migration: add ratingSource to Setting and ProductCsv tables

ALTER TABLE "Setting"
  ADD COLUMN IF NOT EXISTS "globalRatingSource" TEXT DEFAULT 'manual';

ALTER TABLE "ProductCsv"
  ADD COLUMN IF NOT EXISTS "ratingSource" TEXT DEFAULT 'manual';
