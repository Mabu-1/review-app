import { useState, useEffect, useMemo } from "react";
import { useLoaderData, useSubmit, useActionData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

import ProductCsvForm from "../components/ProductCsvForm";
import ProductCsvSidebar from "../components/ProductCsvSidebar";
import WriteReviewModal from "../components/WriteReviewModal";

// LOADER: products + product-csv mappings + shop domain + submit URL
export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);

  const productCsvRows = await prisma.productCsv.findMany({
    where: { shop: session.shop },
    orderBy: { updatedAt: "desc" },
  });

  // Pull reviewSubmitUrl from global settings
  const setting = await prisma.setting.findUnique({
    where: { shop: session.shop },
  });

  // Shopify products for dropdown + sidebar
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
    productCsvRows,
    shopDomain: session.shop,
    graphqlError,
    reviewSubmitUrl: setting?.reviewSubmitUrl || "",
  };
};

// ACTION: save mapping + sync metafield
export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save_product_csv") {
    const productId = formData.get("productId");
    const productTitle = formData.get("productTitle") || "";
    const productImage = formData.get("productImage") || null;
    const csvUrl = formData.get("productCsvUrl") || "";

    if (!productId || !csvUrl) {
      return { success: false, error: "Product and CSV URL are required." };
    }

    await prisma.productCsv.upsert({
      where: { shop_productId: { shop: session.shop, productId: String(productId) } },
      update: { csvUrl: String(csvUrl), productTitle: String(productTitle), productImage: productImage ? String(productImage) : null },
      create: { shop: session.shop, productId: String(productId), productTitle: String(productTitle), productImage: productImage ? String(productImage) : null, csvUrl: String(csvUrl) },
    });

    // sync CSV URL to product metafield
    const mfRes = await admin.graphql(
      `
        mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields { key value }
            userErrors { field message }
          }
        }
      `,
      {
        variables: {
          metafields: [
            {
              ownerId: String(productId),
              namespace: "review_gallery",
              key: "csv_url",
              type: "single_line_text_field",
              value: String(csvUrl),
            },
          ],
        },
      }
    );

    const mfJson = await mfRes.json();
    const userErrors = mfJson?.data?.metafieldsSet?.userErrors || [];
    if (userErrors.length) {
      return { success: false, error: userErrors[0]?.message || "Metafield save failed." };
    }

    return { success: true, toast: "CSV attached to product!" };
  }

  return { success: false, error: "Unknown action." };
};

export default function ProductCsvsPage() {
  const shopify = useAppBridge();
  const data = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();

  const [selectedProductId, setSelectedProductId] = useState("");
  const [productCsvUrl, setProductCsvUrl] = useState("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

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

  useEffect(() => {
    if (!selectedProductId) return setProductCsvUrl("");
    const existing = productMap.get(selectedProductId);
    setProductCsvUrl(existing?.csvUrl || "");
  }, [selectedProductId, productMap]);

  const handleSave = () => {
    if (!selectedProductId || !productCsvUrl) {
      shopify.toast.show("Select a product and paste the CSV URL.");
      return;
    }

    submit(
      {
        intent: "save_product_csv",
        productId: selectedProductId,
        productTitle: selectedProduct?.title || "",
        productImage: selectedProduct?.image || "",
        productCsvUrl,
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

      {/* ── Write a Review button ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button
          onClick={() => setReviewModalOpen(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 20px",
            background: "#111", color: "#fff",
            border: "none", borderRadius: 30,
            fontSize: 14, fontWeight: 600, cursor: "pointer",
            letterSpacing: 0.3,
          }}
        >
          ✏️ Write a Review
        </button>
      </div>

      {data.graphqlError ? (
        <div style={{ padding: 12, border: "1px solid #E0B4B4", background: "#FFF6F6", borderRadius: 8, marginBottom: 16 }}>
          <strong>Shopify API Error:</strong> {data.graphqlError}
          {needsReinstall ? (
            <div style={{ marginTop: 8 }}>
              Fix: Your app needs <code>read_products</code>. Update scopes and <strong>uninstall + reinstall</strong> the app.
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <div style={{ width: 320, flex: "0 0 320px" }}>
          <ProductCsvSidebar
            rows={data.productCsvRows || []}
            selectedProductId={selectedProductId}
            onSelect={setSelectedProductId}
            shopDomain={data.shopDomain}
            products={data.products || []}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <ProductCsvForm
            products={data.products || []}
            selectedProductId={selectedProductId}
            onChangeProductId={setSelectedProductId}
            productCsvUrl={productCsvUrl}
            onChangeCsvUrl={setProductCsvUrl}
            onSave={handleSave}
            currentAttachedUrl={selectedProductId ? productMap.get(selectedProductId)?.csvUrl || "" : ""}
          />
        </div>
      </div>

      {/* ── Write a Review Modal (pre-selects currently selected product) ── */}
      <WriteReviewModal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        submitUrl={data.reviewSubmitUrl}
        products={data.products || []}
        defaultProductHandle={selectedProduct?.handle || ""}
      />
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
