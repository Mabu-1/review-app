-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "csvUrl" TEXT,
    "heading" TEXT DEFAULT 'Customer Reviews',
    "starColor" TEXT DEFAULT '#FFC107',
    "layoutStyle" TEXT DEFAULT 'masonry',
    "showVerifiedBadge" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCsv" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "productId" TEXT,
    "productTitle" TEXT NOT NULL,
    "productImage" TEXT,
    "customKey" TEXT,
    "csvUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCsv_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Setting_shop_key" ON "Setting"("shop");

-- CreateIndex
CREATE INDEX "ProductCsv_shop_idx" ON "ProductCsv"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCsv_shop_productId_key" ON "ProductCsv"("shop", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCsv_shop_customKey_key" ON "ProductCsv"("shop", "customKey");
