import { useState, useEffect, useMemo } from "react";
import { useLoaderData, useSubmit, useActionData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { prismaRetry } from "../utils/prismaRetry.server";

import ProductCsvSidebar from "../components/ProductCsvSidebar";

// ─── LOADER ──────────────────────────────────────────────────────────────────
export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);

  const productCsvRows = await prismaRetry(() =>
    prisma.productCsv.findMany({
      where: { shop: session.shop },
      orderBy: { updatedAt: "desc" },
    })
  );

  let products = [];
  let graphqlError = null;

  try {
    const productRes = await admin.graphql(`
      query ProductsForDropdown {
        products(first: 100) {
          edges {
            node {
              id
              title
              handle
              featuredImage { url }
            }
          }
        }
      }
    `);

    const productJson = await productRes.json();

    if (productJson?.errors?.length) {
      graphqlError = productJson.errors[0]?.message || "GraphQL error";
    } else if (productJson?.data?.products?.edges) {
      products = productJson.data.products.edges.map((e) => ({
        id: e.node.id,
        title: e.node.title,
        handle: e.node.handle,
        image: e.node.featuredImage?.url || null,
      }));
    }
  } catch (e) {
    graphqlError = e?.message || "Failed to load products";
  }

  return {
    products,
    productCsvRows: productCsvRows.map((r) => ({
      ...r,
      rating:      parseFloat(r.rating?.toString() || "0"),
      reviewCount: parseInt(r.reviewCount?.toString() || "0"),
      ratingSource: r.ratingSource || "manual",
      submitUrl:    r.submitUrl    || "",
    })),
    shopDomain: session.shop,
    graphqlError,
  };
};

// ─── ACTION ──────────────────────────────────────────────────────────────────
export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save_product_csv") {
    const productId    = formData.get("productId");
    const productTitle = formData.get("productTitle") || "";
    const productImage = formData.get("productImage") || null;
    const csvUrl       = formData.get("productCsvUrl") || "";
    const rating        = parseFloat(formData.get("rating") || "0");
    const reviewCount   = parseInt(formData.get("reviewCount") || "0");
    const ratingSource  = formData.get("ratingSource") || "manual";
    const submitUrl     = formData.get("submitUrl")    || "";

    if (!productId || !csvUrl) {
      return { success: false, error: "Product and CSV URL are required." };
    }

    // Save to DB
    await prismaRetry(() =>
      prisma.productCsv.upsert({
        where:  { shop_productId: { shop: session.shop, productId: String(productId) } },
        update: {
          csvUrl:       String(csvUrl),
          productTitle: String(productTitle),
          productImage: productImage ? String(productImage) : null,
          rating,
          reviewCount,
          ratingSource,
          submitUrl,
        },
        create: {
          shop:         session.shop,
          productId:    String(productId),
          productTitle: String(productTitle),
          productImage: productImage ? String(productImage) : null,
          csvUrl:       String(csvUrl),
          rating,
          reviewCount,
          ratingSource,
          submitUrl,
        },
      })
    );

    // Sync CSV URL + rating + reviewCount to product metafields
    const mfRes = await admin.graphql(
      `mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { key value }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          metafields: [
            {
              ownerId:   String(productId),
              namespace: "review_gallery",
              key:       "csv_url",
              type:      "single_line_text_field",
              value:     String(csvUrl),
            },
            {
              ownerId:   String(productId),
              namespace: "review_gallery",
              key:       "rating",
              type:      "number_decimal",
              value:     String(rating),
            },
            {
              ownerId:   String(productId),
              namespace: "review_gallery",
              key:       "review_count",
              type:      "number_integer",
              value:     String(reviewCount),
            },
            {
              ownerId:   String(productId),
              namespace: "review_gallery",
              key:       "rating_source",
              type:      "single_line_text_field",
              value:     ratingSource,
            },
          ],
        },
      }
    );

    const mfJson    = await mfRes.json();
    const userErrors = mfJson?.data?.metafieldsSet?.userErrors || [];
    if (userErrors.length) {
      return { success: false, error: userErrors[0]?.message || "Metafield save failed." };
    }

    return { success: true, toast: "Product CSV & rating saved!" };
  }

  if (intent === "delete_product_csv") {
    const productId = formData.get("productId");

    if (!productId) {
      return { success: false, error: "Product ID is required." };
    }

    // Delete from DB
    await prismaRetry(() =>
      prisma.productCsv.deleteMany({
        where: { shop: session.shop, productId: String(productId) },
      })
    );

    // Delete product metafields
    await admin.graphql(
      `mutation MetafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {
        metafieldsDelete(metafields: $metafields) {
          deletedMetafields { key namespace }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          metafields: [
            { ownerId: String(productId), namespace: "review_gallery", key: "csv_url" },
            { ownerId: String(productId), namespace: "review_gallery", key: "rating" },
            { ownerId: String(productId), namespace: "review_gallery", key: "review_count" },
          ],
        },
      }
    );

    return { success: true, toast: "Product CSV removed!" };
  }

  return { success: false, error: "Unknown action." };
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
const labelStyle = { display: "block", fontWeight: 600, marginBottom: 6, color: "#202223", fontSize: 13 };
const inputStyle = { width: "100%", padding: "8px 12px", borderRadius: 4, border: "1px solid #c9cccf", fontSize: 14, marginBottom: 20, boxSizing: "border-box" };

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export default function ProductCsvsPage() {
  const shopify    = useAppBridge();
  const data       = useLoaderData();
  const actionData = useActionData();
  const submit     = useSubmit();
  const [isSaving,   setIsSaving]   = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState("");
  const [productCsvUrl,     setProductCsvUrl]     = useState("");
  const [rating,            setRating]            = useState(0);
  const [reviewCount,       setReviewCount]       = useState(0);
  const [ratingSource,      setRatingSource]      = useState("manual");
  const [submitUrl,         setSubmitUrl]         = useState("");
  const [csvStats,          setCsvStats]          = useState(null); // { avg, count }
  const [csvStatsLoading,   setCsvStatsLoading]   = useState(false);

  const productMap = useMemo(() => {
    const m = new Map();
    for (const row of data.productCsvRows || []) m.set(row.productId, row);
    return m;
  }, [data.productCsvRows]);

  const selectedProduct = useMemo(() => {
    return (data.products || []).find((p) => p.id === selectedProductId) || null;
  }, [data.products, selectedProductId]);

  useEffect(() => {
    if (actionData?.toast) { shopify.toast.show(actionData.toast); setIsSaving(false); setIsDeleting(false); }
    if (actionData?.error) { shopify.toast.show(actionData.error); setIsSaving(false); setIsDeleting(false); }
  }, [actionData, shopify]);

  // When product selected — load existing values
  useEffect(() => {
    if (!selectedProductId) {
      setProductCsvUrl("");
      setRating(0);
      setReviewCount(0);
      setRatingSource("manual");
      setSubmitUrl("");
      return;
    }
    const existing = productMap.get(selectedProductId);
    setProductCsvUrl(existing?.csvUrl || "");
    setRating(      parseFloat(existing?.rating?.toString()      || "0"));
    setReviewCount( parseInt(  existing?.reviewCount?.toString() || "0"));
    setRatingSource(existing?.ratingSource || "manual");
    setSubmitUrl(   existing?.submitUrl    || "");
  }, [selectedProductId, productMap]);

  const handleDelete = (productId, productTitle) => {
    setIsDeleting(true);
    submit(
      { intent: "delete_product_csv", productId },
      { method: "POST" }
    );
    if (selectedProductId === productId) {
      setSelectedProductId("");
      setProductCsvUrl("");
      setRating(0);
      setReviewCount(0);
    }
  };

  // Fetch CSV and calculate stats when auto mode + csvUrl
  useEffect(() => {
    setCsvStats(null);
    if (ratingSource !== "auto" || !productCsvUrl) return;

    setCsvStatsLoading(true);
    const sep = productCsvUrl.includes("?") ? "&" : "?";
    fetch(productCsvUrl + sep + "t=" + Date.now())
      .then((r) => r.text())
      .then((text) => {
        // Proper CSV row parser that handles quoted fields
        const parseRow = (line) => {
          const cols = []; let cur = "", inQ = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') { inQ = !inQ; }
            else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
            else { cur += ch; }
          }
          cols.push(cur.trim());
          return cols;
        };
        const lines = text.trim().split("\n");
        lines.shift(); // skip header
        let sum = 0, count = 0;
        lines.forEach((line) => {
          if (!line.trim()) return;
          const cols = parseRow(line);
          const r = parseFloat(cols[1]);
          if (!isNaN(r) && r > 0) { sum += r; count++; }
        });
        setCsvStats({ avg: count > 0 ? (sum / count).toFixed(1) : "0.0", count });
        setCsvStatsLoading(false);
      })
      .catch(() => { setCsvStats(null); setCsvStatsLoading(false); });
  }, [ratingSource, productCsvUrl]);

  const handleSave = () => {
    if (!selectedProductId || !productCsvUrl) {
      shopify.toast.show("Select a product and paste the CSV URL.");
      return;
    }

    setIsSaving(true);
    submit(
      {
        intent:        "save_product_csv",
        productId:     selectedProductId,
        productTitle:  selectedProduct?.title || "",
        productImage:  selectedProduct?.image || "",
        productCsvUrl,
        rating:        String(rating),
        reviewCount:   String(reviewCount),
        ratingSource,
        submitUrl,
      },
      { method: "POST" }
    );
  };

  const needsReinstall =
    typeof data.graphqlError === "string" &&
    (data.graphqlError.toLowerCase().includes("access denied") ||
      data.graphqlError.toLowerCase().includes("products field"));

  return (
    <s-page heading="Product CSVs">

      {data.graphqlError ? (
        <div style={{ padding: 12, border: "1px solid #E0B4B4", background: "#FFF6F6", borderRadius: 8, marginBottom: 16 }}>
          <strong>Shopify API Error:</strong> {data.graphqlError}
          {needsReinstall && (
            <div style={{ marginTop: 8 }}>
              Fix: Your app needs <code>read_products</code>. Update scopes and <strong>uninstall + reinstall</strong> the app.
            </div>
          )}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

        {/* ── Sidebar ── */}
        <div style={{ width: 320, flex: "0 0 320px" }}>
          <ProductCsvSidebar
            rows={data.productCsvRows || []}
            selectedProductId={selectedProductId}
            onSelect={setSelectedProductId}
            onDelete={handleDelete}
            isDeleting={isDeleting}
            shopDomain={data.shopDomain}
            products={data.products || []}
          />
        </div>

        {/* ── Form ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <s-section heading="Attach CSV & Rating to a Product">
            <s-paragraph>
              Select a product, attach its CSV link, and set the rating summary shown in the gallery header.
            </s-paragraph>

            <div style={{ marginTop: 15 }}>

              {/* Product dropdown */}
              <label style={labelStyle}>Select Product</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                style={inputStyle}
              >
                <option value="">-- Choose a product --</option>
                {(data.products || []).map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>

              {/* CSV URL */}
              <label style={labelStyle}>CSV Link for this product</label>
              <input
                type="url"
                placeholder="https://docs.google.com/... (published CSV link)"
                value={productCsvUrl}
                onChange={(e) => setProductCsvUrl(e.target.value)}
                style={inputStyle}
              />

              {/* Per-product Apps Script URL */}
              <label style={labelStyle}>Apps Script URL (for this product)</label>
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/... (leave blank to use global)"
                value={submitUrl}
                onChange={(e) => setSubmitUrl(e.target.value)}
                style={inputStyle}
              />
              <div style={{ fontSize: 12, color: "#6d7175", marginTop: -16, marginBottom: 20 }}>
                Leave blank to use the global Apps Script URL from Dashboard settings.
              </div>

              {/* Rating Source Toggle */}
              <label style={labelStyle}>Rating Source</label>
              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                {["auto", "manual"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setRatingSource(opt)}
                    style={{
                      padding: "8px 20px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      border: ratingSource === opt ? "2px solid #111" : "1px solid #c9cccf",
                      background: ratingSource === opt ? "#111" : "#fff",
                      color: ratingSource === opt ? "#fff" : "#333",
                    }}
                  >
                    {opt === "auto" ? "⚡ Auto-calculate from CSV" : "✏️ Manual"}
                  </button>
                ))}
              </div>

              {ratingSource === "auto" ? (
                <div style={{ padding: "14px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, fontSize: 13, color: "#15803d", marginBottom: 20 }}>
                  ✅ Rating and review count will be automatically calculated from this product's CSV data each time the gallery loads.
                </div>
              ) : (
                <div style={{ display: "flex", gap: 20 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Average Rating (e.g. 4.8)</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={rating}
                      onChange={(e) => { const val = parseFloat(e.target.value) || 0; setRating(Math.min(5, Math.max(0, val))); }}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Total Review Count (e.g. 124)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={reviewCount}
                      onChange={(e) => setReviewCount(parseInt(e.target.value) || 0)}
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}

              {/* Live Preview */}
              <div style={{ marginTop: 8, marginBottom: 20, padding: "14px 16px", background: "#f8f9fa", border: "1px solid #e1e3e5", borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: "#6d7175", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Preview</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", gap: 2 }}>
                    {[1,2,3,4,5].map((star) => {
                      const r = ratingSource === "auto" ? 5 : rating;
                      const filled = star <= Math.floor(r);
                      const half   = !filled && star === Math.ceil(r) && r % 1 >= 0.3;
                      return (
                        <svg key={star} width="18" height="18" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                            fill={filled ? "#FFC107" : half ? "#FFC107" : "#e1e3e5"} />
                        </svg>
                      );
                    })}
                  </div>
                  {ratingSource === "auto" ? (
                    csvStatsLoading ? (
                      <span style={{ fontSize: 13, color: "#6d7175" }}>Calculating from CSV…</span>
                    ) : csvStats ? (
                      <>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#202223" }}>{csvStats.avg}</span>
                        <span style={{ fontSize: 13, color: "#6d7175" }}>({csvStats.count} reviews) — auto</span>
                      </>
                    ) : (
                      <span style={{ fontSize: 13, color: "#6d7175" }}>⚡ Will calculate from CSV on storefront</span>
                    )
                  ) : (
                    <>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#202223" }}>{parseFloat(rating).toFixed(1)}</span>
                      <span style={{ fontSize: 13, color: "#6d7175" }}>({reviewCount} reviews)</span>
                    </>
                  )}
                </div>
              </div>

              {/* Save button */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || isDeleting}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "10px 20px", background: isSaving ? "#6d7175" : "#111",
                    color: "#fff", border: "none", borderRadius: 6,
                    fontSize: 14, fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer",
                    transition: "background 0.2s",
                  }}
                >
                  {isSaving ? (
                    <>
                      <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "rg-spin 0.7s linear infinite" }} />
                      Saving…
                    </>
                  ) : "Save Product CSV & Rating"}
                </button>
              </div>
              <style>{`@keyframes rg-spin { to { transform: rotate(360deg); } }`}</style>

              {/* Currently attached info */}
              {selectedProductId && productMap.get(selectedProductId) ? (
                <div style={{ marginTop: 12, fontSize: 13, color: "#6d7175" }}>
                  <div style={{ wordBreak: "break-word" }}>
                    <strong>CSV:</strong> {productMap.get(selectedProductId)?.csvUrl}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <strong>Rating:</strong> {parseFloat(productMap.get(selectedProductId)?.rating?.toString() || "0").toFixed(1)} &nbsp;|&nbsp;
                    <strong>Count:</strong> {productMap.get(selectedProductId)?.reviewCount || 0} reviews
                  </div>
                </div>
              ) : null}

            </div>
          </s-section>
        </div>

      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
