import { useState, useEffect, useMemo } from "react";
import { useLoaderData, useSubmit, useActionData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

import ProductCsvForm from "../components/ProductCsvForm";
import ProductCsvSidebar from "../components/ProductCsvSidebar";

// LOADER: products + product-csv mappings + shop domain
export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);

  const productCsvRows = await prisma.productCsv.findMany({
    where: { shop: session.shop },
    orderBy: { updatedAt: "desc" },
  });

  // ✅ include handle so we can open storefront URL
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
  const products = (productJson?.data?.products?.edges || []).map((e) => ({
    id: e.node.id,
    title: e.node.title,
    handle: e.node.handle,
    image: e.node.featuredImage?.url || null,
  }));

  return {
    products,
    productCsvRows,
    shopDomain: session.shop,
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
      where: { shop_productId: { shop: session.shop, productId } },
      update: { csvUrl, productTitle, productImage },
      create: { shop: session.shop, productId, productTitle, productImage, csvUrl },
    });

    // keep syncing CSV URL to product metafield
    await admin.graphql(
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
              ownerId: productId,
              namespace: "review_gallery",
              key: "csv_url",
              type: "single_line_text_field",
              value: csvUrl,
            },
          ],
        },
      }
    );

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

  return (
    <s-page heading="Product CSVs">
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <div style={{ width: 320, flex: "0 0 320px" }}>
          <ProductCsvSidebar
            rows={data.productCsvRows || []}
            selectedProductId={selectedProductId}
            onSelect={setSelectedProductId}
            shopDomain={data.shopDomain}
            products={data.products || []}   // ✅ needed for storefront handle
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
            currentAttachedUrl={selectedProductId ? (productMap.get(selectedProductId)?.csvUrl || "") : ""}
          />
        </div>
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
