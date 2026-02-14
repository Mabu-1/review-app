-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProductCsv" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "productId" TEXT,
    "productTitle" TEXT NOT NULL,
    "productImage" TEXT,
    "customKey" TEXT,
    "csvUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ProductCsv" ("createdAt", "csvUrl", "id", "productId", "productImage", "productTitle", "shop", "updatedAt") SELECT "createdAt", "csvUrl", "id", "productId", "productImage", "productTitle", "shop", "updatedAt" FROM "ProductCsv";
DROP TABLE "ProductCsv";
ALTER TABLE "new_ProductCsv" RENAME TO "ProductCsv";
CREATE INDEX "ProductCsv_shop_idx" ON "ProductCsv"("shop");
CREATE UNIQUE INDEX "ProductCsv_shop_productId_key" ON "ProductCsv"("shop", "productId");
CREATE UNIQUE INDEX "ProductCsv_shop_customKey_key" ON "ProductCsv"("shop", "customKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
