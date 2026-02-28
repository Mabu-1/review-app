import { useState, useEffect, useMemo } from "react";
import { useLoaderData, useSubmit, useActionData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

import ProductCsvSidebar from "../components/ProductCsvSidebar";

// ─── LOADER ──────────────────────────────────────────────────────────────────
export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);

  const productCsvRows = await prisma.productCsv.findMany({
    where: { shop: session.shop },
    orderBy: { updatedAt: "desc" },
  });

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
    const rating       = parseFloat(formData.get("rating") || "0");
    const reviewCount  = parseInt(formData.get("reviewCount") || "0");

    if (!productId || !csvUrl) {
      return { success: false, error: "Product and CSV URL are required." };
    }

    // Save to DB
    await prisma.productCsv.upsert({
      where:  { shop_productId: { shop: session.shop, productId: String(productId) } },
      update: {
        csvUrl:       String(csvUrl),
        productTitle: String(productTitle),
        productImage: productImage ? String(productImage) : null,
        rating,
        reviewCount,
      },
      create: {
        shop:         session.shop,
        productId:    String(productId),
        productTitle: String(productTitle),
        productImage: productImage ? String(productImage) : null,
        csvUrl:       String(csvUrl),
        rating,
        reviewCount,
      },
    });

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

  const [selectedProductId, setSelectedProductId] = useState("");
  const [productCsvUrl,     setProductCsvUrl]     = useState("");
  const [rating,            setRating]            = useState(0);
  const [reviewCount,       setReviewCount]       = useState(0);

  const productMap = useMemo(() => {
    const m = new Map();
    for (const row of data.productCsvRows || []) m.set(row.productId, row);
    return m;
  }, [data.productCsvRows]);

  const selectedProduct = useMemo(() => {
    return (data.products || []).find((p) => p.id === selectedProductId) || null;
  }, [data.products, selectedProductId]);

  useEffect(() => {
    if (actionData?.toast) shopify.toast.show(actionData.toast);
    if (actionData?.error) shopify.toast.show(actionData.error);
  }, [actionData, shopify]);

  // When product selected — load existing values
  useEffect(() => {
    if (!selectedProductId) {
      setProductCsvUrl("");
      setRating(0);
      setReviewCount(0);
      return;
    }
    const existing = productMap.get(selectedProductId);
    setProductCsvUrl(existing?.csvUrl || "");
    setRating(      parseFloat(existing?.rating?.toString()      || "0"));
    setReviewCount( parseInt(  existing?.reviewCount?.toString() || "0"));
  }, [selectedProductId, productMap]);

  const handleSave = () => {
    if (!selectedProductId || !productCsvUrl) {
      shopify.toast.show("Select a product and paste the CSV URL.");
      return;
    }

    submit(
      {
        intent:        "save_product_csv",
        productId:     selectedProductId,
        productTitle:  selectedProduct?.title || "",
        productImage:  selectedProduct?.image || "",
        productCsvUrl,
        rating:        String(rating),
        reviewCount:   String(reviewCount),
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

              {/* Rating + Review Count side by side */}
              <div style={{ display: "flex", gap: 20 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Average Rating (e.g. 4.8)</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={rating}
                    onChange={(e) => setRating(parseFloat(e.target.value) || 0)}
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

              {/* Save button */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <s-button variant="primary" onClick={handleSave}>
                  Save Product CSV & Rating
                </s-button>
              </div>

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
