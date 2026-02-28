-- Migration: add submitUrl to ProductCsv + create PendingReview table

ALTER TABLE "ProductCsv"
  ADD COLUMN IF NOT EXISTS "submitUrl" TEXT;

CREATE TABLE IF NOT EXISTS "PendingReview" (
  "id"           TEXT NOT NULL,
  "shop"         TEXT NOT NULL,
  "productId"    TEXT NOT NULL,
  "productTitle" TEXT NOT NULL DEFAULT '',
  "rowIndex"     INTEGER NOT NULL,
  "author"       TEXT NOT NULL DEFAULT '',
  "rating"       INTEGER NOT NULL DEFAULT 5,
  "body"         TEXT NOT NULL DEFAULT '',
  "date"         TEXT NOT NULL DEFAULT '',
  "photoUrl"     TEXT NOT NULL DEFAULT '',
  "variant"      TEXT NOT NULL DEFAULT '',
  "seenAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PendingReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PendingReview_shop_idx" ON "PendingReview"("shop");
CREATE UNIQUE INDEX IF NOT EXISTS "PendingReview_shop_productId_rowIndex_key" 
  ON "PendingReview"("shop", "productId", "rowIndex");
