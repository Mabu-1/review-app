-- Migration: add all new settings fields to Setting table
-- Run with: prisma migrate deploy

ALTER TABLE "Setting"
  -- Colors
  ADD COLUMN IF NOT EXISTS "bgColor"            TEXT DEFAULT '#f8f9fa',
  ADD COLUMN IF NOT EXISTS "cardBgColor"        TEXT DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS "textColor"          TEXT DEFAULT '#333333',
  ADD COLUMN IF NOT EXISTS "buttonBg"           TEXT DEFAULT '#111111',
  ADD COLUMN IF NOT EXISTS "buttonText"         TEXT DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS "verifiedBadgeColor" TEXT DEFAULT '#4CAF50',
  ADD COLUMN IF NOT EXISTS "formAccentColor"    TEXT DEFAULT '#111111',

  -- Layout
  ADD COLUMN IF NOT EXISTS "cardLayout"      TEXT    DEFAULT 'masonry',
  ADD COLUMN IF NOT EXISTS "columnsDesktop"  INTEGER DEFAULT 4,
  ADD COLUMN IF NOT EXISTS "columnsMobile"   INTEGER DEFAULT 1,

  -- Load counts
  ADD COLUMN IF NOT EXISTS "initialLoadCount" INTEGER DEFAULT 12,
  ADD COLUMN IF NOT EXISTS "loadMoreCount"    INTEGER DEFAULT 12,

  -- Feature toggles
  ADD COLUMN IF NOT EXISTS "showSearch"         BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS "showFilters"        BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS "showSorting"        BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS "showLightbox"       BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS "showLoadMore"       BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS "showWriteReviewBtn" BOOLEAN DEFAULT true,

  -- Write a review form
  ADD COLUMN IF NOT EXISTS "formTitle"      TEXT DEFAULT 'Share Your Experience',
  ADD COLUMN IF NOT EXISTS "formSubtitle"   TEXT DEFAULT 'Your honest review helps other customers make better decisions.',
  ADD COLUMN IF NOT EXISTS "formSuccessMsg" TEXT DEFAULT 'Thank you for your review! It will appear shortly after approval.',
  ADD COLUMN IF NOT EXISTS "formSubmitUrl"  TEXT;

-- Note: "starColor" and "layoutStyle" already exist.
-- "layoutStyle" is now replaced by "cardLayout" — they serve the same purpose.
-- You can drop "layoutStyle" later once you confirm everything works:
-- ALTER TABLE "Setting" DROP COLUMN IF EXISTS "layoutStyle";
