import { useState, useEffect } from "react";
import { useLoaderData, useSubmit, useActionData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// LOADER (only global settings)
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const setting = await prisma.setting.findUnique({
    where: { shop: session.shop },
  });

  return {
    csvUrl: setting?.csvUrl || "",
    heading: setting?.heading || "Customer Reviews",
    starColor: setting?.starColor || "#FFC107",
    layoutStyle: setting?.layoutStyle || "masonry",
    showVerifiedBadge: setting?.showVerifiedBadge ?? true,
  };
};

// ACTION (save global settings + sync shop metafield)
export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent !== "save_settings") {
    return { success: false, error: "Unknown action." };
  }

  const settingsData = {
    csvUrl: formData.get("csvUrl") || "",
    heading: formData.get("heading") || "Customer Reviews",
    starColor: formData.get("starColor") || "#FFC107",
    layoutStyle: formData.get("layoutStyle") || "masonry",
    showVerifiedBadge: formData.get("showVerifiedBadge") === "true",
  };

  await prisma.setting.upsert({
    where: { shop: session.shop },
    update: settingsData,
    create: { shop: session.shop, ...settingsData },
  });

  // sync to SHOP metafield
  const shopResponse = await admin.graphql(`{ shop { id } }`);
  const shopJson = await shopResponse.json();
  const shopId = shopJson.data.shop.id;

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
            ownerId: shopId,
            namespace: "review_gallery",
            key: "settings",
            type: "json",
            value: JSON.stringify(settingsData),
          },
        ],
      },
    }
  );

  return { success: true, toast: "Global settings saved!" };
};

export default function Index() {
  const shopify = useAppBridge();
  const data = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();

  const [csvUrl, setCsvUrl] = useState(data.csvUrl);
  const [heading, setHeading] = useState(data.heading);
  const [starColor, setStarColor] = useState(data.starColor);
  const [layoutStyle, setLayoutStyle] = useState(data.layoutStyle);
  const [showVerifiedBadge, setShowVerifiedBadge] = useState(data.showVerifiedBadge);

  useEffect(() => {
    if (actionData?.toast) shopify.toast.show(actionData.toast);
    if (actionData?.error) shopify.toast.show(actionData.error);
  }, [actionData, shopify]);

  const handleSaveSettings = () => {
    submit(
      {
        intent: "save_settings",
        csvUrl,
        heading,
        starColor,
        layoutStyle,
        showVerifiedBadge: showVerifiedBadge.toString(),
      },
      { method: "POST" }
    );
  };

  const labelStyle = { display: "block", fontWeight: 600, marginBottom: 6, color: "#202223", fontSize: 13 };
  const inputStyle = { width: "100%", padding: "8px 12px", borderRadius: 4, border: "1px solid #c9cccf", fontSize: 14, marginBottom: 20, boxSizing: "border-box" };

  return (
    <s-page heading="Review Gallery Pro - Dashboard">
      <s-section heading="1. Data Source (Global)">
        <s-paragraph>
          Global CSV for the whole shop (optional). If you use per-product CSV, you may not need this.
        </s-paragraph>

        <label style={labelStyle}>Google Sheets CSV Link</label>
        <input
          type="url"
          placeholder="https://docs.google.com/..."
          value={csvUrl}
          onChange={(e) => setCsvUrl(e.target.value)}
          style={inputStyle}
        />
      </s-section>

      <s-section heading="2. Design & Text">
        <label style={labelStyle}>Gallery Heading Text</label>
        <input
          type="text"
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          style={inputStyle}
        />

        <label style={labelStyle}>Star Rating Color</label>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <input
            type="color"
            value={starColor}
            onChange={(e) => setStarColor(e.target.value)}
            style={{ width: 50, height: 40, padding: 0, border: "1px solid #c9cccf", borderRadius: 4, cursor: "pointer" }}
          />
          <input
            type="text"
            value={starColor}
            onChange={(e) => setStarColor(e.target.value)}
            style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
          />
        </div>
      </s-section>

      <s-section heading="3. Layout Options">
        <label style={labelStyle}>Grid Style</label>
        <select value={layoutStyle} onChange={(e) => setLayoutStyle(e.target.value)} style={inputStyle}>
          <option value="masonry">Smart Masonry (Cards fit together seamlessly)</option>
          <option value="grid">Standard Grid (Cards line up in even rows)</option>
        </select>

        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginTop: 10 }}>
          <input
            type="checkbox"
            checked={showVerifiedBadge}
            onChange={(e) => setShowVerifiedBadge(e.target.checked)}
            style={{ width: 18, height: 18, cursor: "pointer" }}
          />
          <span style={{ fontWeight: 500, fontSize: 14 }}>Show "Verified" Badges on Reviews</span>
        </label>
      </s-section>

      <div style={{ padding: "20px 0", textAlign: "right" }}>
        <s-button variant="primary" onClick={handleSaveSettings}>
          Save All Settings
        </s-button>
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
