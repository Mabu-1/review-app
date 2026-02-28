import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const pendingCount = await prisma.pendingReview.count({
    where: { shop: session.shop },
  });

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    pendingCount,
  };
};

export default function App() {
  const { apiKey, pendingCount } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app/setup-guide">Setup Guide</s-link>
        <s-link href="/app">Dashboard</s-link>
        <s-link href="/app/product-reviews">Product Reviews</s-link>
        <s-link href="/app/pending-reviews">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            🔔 Pending Reviews
            {pendingCount > 0 && (
              <span style={{
                background: "#d72c0d", color: "#fff",
                borderRadius: "50%", width: 18, height: 18,
                fontSize: 11, fontWeight: 700,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            )}
          </span>
        </s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
