import { useState, useEffect } from "react";
import { useLoaderData, useSubmit, useActionData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { prismaRetry } from "../utils/prismaRetry.server";

// ─── LOADER ──────────────────────────────────────────────────────────────────
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const [pendingReviews, productCsvRows, setting] = await Promise.all([
    prismaRetry(() =>
      prisma.pendingReview.findMany({
        where: { shop: session.shop },
        orderBy: { seenAt: "desc" },
      })
    ),
    prismaRetry(() =>
      prisma.productCsv.findMany({
        where: { shop: session.shop },
      })
    ),
    prismaRetry(() =>
      prisma.setting.findUnique({ where: { shop: session.shop } })
    ),
  ]);

  return {
    pendingReviews,
    productCsvRows: productCsvRows.map((r) => ({
      ...r,
      submitUrl: r.submitUrl || "",
    })),
    globalSubmitUrl: setting?.formSubmitUrl || "",
  };
};

// ─── ACTION ──────────────────────────────────────────────────────────────────
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  // Sync pending reviews from all CSVs
  if (intent === "sync_pending") {
    const productCsvRows = await prismaRetry(() =>
      prisma.productCsv.findMany({ where: { shop: session.shop } })
    );

    let totalFound = 0;

    for (const row of productCsvRows) {
      if (!row.csvUrl) continue;

      try {
        const sep = row.csvUrl.includes("?") ? "&" : "?";
        const res  = await fetch(row.csvUrl + sep + "t=" + Date.now());
        const text = await res.text();

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

        for (let i = 0; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const cols      = parseRow(lines[i]);
          const verified  = (cols[7] || "").toUpperCase();
          if (["TRUE","1","YES","Y"].includes(verified)) continue;

          const rowIndex = i + 2; // +1 for header, +1 for 1-based
          const id       = `${session.shop}_${row.productId}_${rowIndex}`;

          await prismaRetry(() =>
            prisma.pendingReview.upsert({
              where:  { shop_productId_rowIndex: { shop: session.shop, productId: row.productId, rowIndex } },
              update: {},
              create: {
                id,
                shop:         session.shop,
                productId:    row.productId,
                productTitle: row.productTitle || "",
                rowIndex,
                author:   (cols[2] || "").trim(),
                rating:   parseInt(cols[1]) || 5,
                body:     (cols[4] || "").trim(),
                date:     (cols[5] || "").trim(),
                photoUrl: (cols[6] || "").trim(),
                variant:  (cols[8] || "").trim(),
              },
            })
          );
          totalFound++;
        }
      } catch (e) {
        console.error("Failed to fetch CSV for", row.productId, e);
      }
    }

    return { success: true, toast: `Sync complete — ${totalFound} pending review(s) found.` };
  }

  // Verify a review via Apps Script
  if (intent === "verify_review") {
    const reviewId   = formData.get("reviewId");
    const rowIndex   = parseInt(formData.get("rowIndex"));
    const submitUrl  = formData.get("submitUrl");

    if (!submitUrl) {
      return { success: false, error: "No Apps Script URL configured for this product." };
    }

    try {
      const res = await fetch(submitUrl, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "verify", rowIndex }),
      });
      const json = await res.json();
      if (!json.success) {
        return { success: false, error: json.error || "Apps Script returned an error." };
      }
    } catch (e) {
      return { success: false, error: "Failed to reach Apps Script: " + e.message };
    }

    // Remove from pending list
    await prismaRetry(() =>
      prisma.pendingReview.deleteMany({ where: { id: reviewId } })
    );

    return { success: true, toast: "Review verified! ✅" };
  }

  // Delete a review via Apps Script
  if (intent === "delete_review") {
    const reviewId  = formData.get("reviewId");
    const rowIndex  = parseInt(formData.get("rowIndex"));
    const submitUrl = formData.get("submitUrl");

    if (!submitUrl) {
      return { success: false, error: "No Apps Script URL configured for this product." };
    }

    try {
      const res = await fetch(submitUrl, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "delete", rowIndex }),
      });
      const json = await res.json();
      if (!json.success) {
        return { success: false, error: json.error || "Apps Script returned an error." };
      }
    } catch (e) {
      return { success: false, error: "Failed to reach Apps Script: " + e.message };
    }

    await prismaRetry(() =>
      prisma.pendingReview.deleteMany({ where: { id: reviewId } })
    );

    return { success: true, toast: "Review deleted! 🗑" };
  }

  // Dismiss (remove from pending list without touching sheet)
  if (intent === "dismiss_review") {
    const reviewId = formData.get("reviewId");
    await prismaRetry(() =>
      prisma.pendingReview.deleteMany({ where: { id: reviewId } })
    );
    return { success: true, toast: "Review dismissed." };
  }

  return { success: false, error: "Unknown action." };
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function StarDisplay({ rating }) {
  return (
    <span style={{ color: "#FFC107", fontSize: 14 }}>
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

function ActionBtn({ onClick, disabled, color, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer", border: "none",
        background: color, color: "#fff", opacity: disabled ? 0.6 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {children}
    </button>
  );
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export default function PendingReviewsPage() {
  const shopify    = useAppBridge();
  const data       = useLoaderData();
  const actionData = useActionData();
  const submit     = useSubmit();

  const [loadingId, setLoadingId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [reviews,   setReviews]   = useState(data.pendingReviews || []);

  // Build submitUrl lookup: productId → submitUrl
  const submitUrlMap = {};
  for (const row of data.productCsvRows || []) {
    submitUrlMap[row.productId] = row.submitUrl || data.globalSubmitUrl || "";
  }

  useEffect(() => {
    if (actionData?.toast) {
      shopify.toast.show(actionData.toast);
      setLoadingId(null);
      setIsSyncing(false);
      if (actionData.success) {
        // Reload page to refresh list
        window.location.reload();
      }
    }
    if (actionData?.error) {
      shopify.toast.show(actionData.error);
      setLoadingId(null);
      setIsSyncing(false);
    }
  }, [actionData, shopify]);

  const handleSync = () => {
    setIsSyncing(true);
    submit({ intent: "sync_pending" }, { method: "POST" });
  };

  const handleVerify = (review) => {
    setLoadingId(review.id + "_verify");
    submit({
      intent:    "verify_review",
      reviewId:  review.id,
      rowIndex:  String(review.rowIndex),
      submitUrl: submitUrlMap[review.productId] || "",
    }, { method: "POST" });
  };

  const handleDelete = (review) => {
    setLoadingId(review.id + "_delete");
    submit({
      intent:    "delete_review",
      reviewId:  review.id,
      rowIndex:  String(review.rowIndex),
      submitUrl: submitUrlMap[review.productId] || "",
    }, { method: "POST" });
  };

  const handleDismiss = (review) => {
    setLoadingId(review.id + "_dismiss");
    submit({ intent: "dismiss_review", reviewId: review.id }, { method: "POST" });
  };

  // Group by product
  const grouped = {};
  for (const r of reviews) {
    if (!grouped[r.productTitle]) grouped[r.productTitle] = [];
    grouped[r.productTitle].push(r);
  }

  return (
    <s-page heading="Pending Reviews">

      {/* Header bar */}
      <s-section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, color: "#202223" }}>
              <strong>{reviews.length}</strong> unverified review{reviews.length !== 1 ? "s" : ""} waiting for approval.
            </div>
            <div style={{ fontSize: 12, color: "#6d7175", marginTop: 4 }}>
              Sync fetches all your product CSVs and finds new unverified reviews.
            </div>
          </div>
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 20px", background: isSyncing ? "#6d7175" : "#111",
              color: "#fff", border: "none", borderRadius: 6,
              fontSize: 14, fontWeight: 600, cursor: isSyncing ? "not-allowed" : "pointer",
            }}
          >
            {isSyncing ? (
              <>
                <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "rg-spin 0.7s linear infinite" }} />
                Syncing…
              </>
            ) : "🔄 Sync Now"}
          </button>
          <style>{`@keyframes rg-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </s-section>

      {reviews.length === 0 ? (
        <s-section>
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#6d7175" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>All caught up!</div>
            <div style={{ fontSize: 13 }}>No pending reviews. Click Sync Now to check for new ones.</div>
          </div>
        </s-section>
      ) : (
        Object.entries(grouped).map(([productTitle, productReviews]) => (
          <s-section key={productTitle} heading={productTitle}>
            {productReviews.map((review) => {
              const isVerifying = loadingId === review.id + "_verify";
              const isDeleting  = loadingId === review.id + "_delete";
              const isDismissing = loadingId === review.id + "_dismiss";
              const busy = isVerifying || isDeleting || isDismissing;
              const noUrl = !submitUrlMap[review.productId];

              return (
                <div
                  key={review.id}
                  style={{
                    border: "1px solid #e1e3e5", borderRadius: 10,
                    padding: "16px 20px", marginBottom: 12,
                    background: "#fff", opacity: busy ? 0.7 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#202223" }}>{review.author || "Anonymous"}</div>
                      <div style={{ fontSize: 12, color: "#6d7175", marginTop: 2 }}>
                        {review.date} {review.variant ? `· ${review.variant}` : ""}
                        <span style={{ marginLeft: 8, background: "#fff4e5", color: "#c05717", border: "1px solid #ffd79d", borderRadius: 4, padding: "1px 7px", fontSize: 11, fontWeight: 600 }}>
                          Unverified
                        </span>
                      </div>
                    </div>
                    <StarDisplay rating={review.rating} />
                  </div>

                  {/* Body */}
                  {review.body && (
                    <p style={{ fontSize: 13, color: "#4a4a4a", lineHeight: 1.6, margin: "0 0 12px" }}>
                      {review.body}
                    </p>
                  )}

                  {/* Photo */}
                  {review.photoUrl && (
                    <img
                      src={review.photoUrl}
                      alt="Review photo"
                      style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, marginBottom: 12 }}
                    />
                  )}

                  {/* No URL warning */}
                  {noUrl && (
                    <div style={{ fontSize: 12, color: "#c05717", background: "#fff4e5", border: "1px solid #ffd79d", borderRadius: 6, padding: "6px 10px", marginBottom: 10 }}>
                      ⚠️ No Apps Script URL set for this product. Go to Product Reviews to add one.
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <ActionBtn
                      onClick={() => handleVerify(review)}
                      disabled={busy || noUrl}
                      color="#15803d"
                    >
                      {isVerifying ? "Verifying…" : "✅ Verify"}
                    </ActionBtn>
                    <ActionBtn
                      onClick={() => handleDelete(review)}
                      disabled={busy || noUrl}
                      color="#d72c0d"
                    >
                      {isDeleting ? "Deleting…" : "🗑 Delete"}
                    </ActionBtn>
                    <ActionBtn
                      onClick={() => handleDismiss(review)}
                      disabled={busy}
                      color="#6d7175"
                    >
                      {isDismissing ? "Dismissing…" : "Dismiss"}
                    </ActionBtn>
                  </div>
                </div>
              );
            })}
          </s-section>
        ))
      )}

    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
