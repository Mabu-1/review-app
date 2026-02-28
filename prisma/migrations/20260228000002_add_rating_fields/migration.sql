-- Migration: add rating and reviewCount to Setting and ProductCsv tables

ALTER TABLE "Setting"
  ADD COLUMN IF NOT EXISTS "globalRating"     DECIMAL(3,1) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS "globalReviewCount" INTEGER      DEFAULT 0;

ALTER TABLE "ProductCsv"
  ADD COLUMN IF NOT EXISTS "rating"      DECIMAL(3,1) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER      DEFAULT 0;
