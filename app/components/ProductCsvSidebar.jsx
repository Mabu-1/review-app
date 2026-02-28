function getNumericProductId(gid) {
  if (!gid) return "";
  const parts = String(gid).split("/");
  return parts[parts.length - 1] || "";
}

function EyeIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function GearIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="2" />
      <path d="M19.4 15a7.9 7.9 0 0 0 .1-1l2-1.2-2-3.4-2.3.6a7.3 7.3 0 0 0-.8-.8l.6-2.3-3.4-2-1.2 2a7.9 7.9 0 0 0-2 0l-1.2-2-3.4 2 .6 2.3c-.3.2-.6.5-.8.8l-2.3-.6-2 3.4 2 1.2a7.9 7.9 0 0 0 0 2l-2 1.2 2 3.4 2.3-.6c.2.3.5.6.8.8l-.6 2.3 3.4 2 1.2-2a7.9 7.9 0 0 0 2 0l1.2 2 3.4-2-.6-2.3c.3-.2.6-.5.8-.8l2.3.6 2-3.4-2-1.2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FFC107" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function TrashIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

import { useState, useEffect } from "react";

export default function ProductCsvSidebar({
  rows,
  selectedProductId,
  onSelect,
  onDelete,
  isDeleting,
  shopDomain,
  products,
}) {
  const [confirmingId, setConfirmingId] = useState(null);
  const [csvStatsMap,   setCsvStatsMap]   = useState({});

  // Fetch CSV stats for auto products
  useEffect(() => {
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

    (rows || []).forEach((r) => {
      if (r.ratingSource !== "auto" || !r.csvUrl) return;
      const sep = r.csvUrl.includes("?") ? "&" : "?";
      fetch(r.csvUrl + sep + "t=" + Date.now())
        .then((res) => res.text())
        .then((text) => {
          const lines = text.trim().split("\n");
          lines.shift();
          let sum = 0, count = 0;
          lines.forEach((line) => {
            if (!line.trim()) return;
            const cols = parseRow(line);
            const rating = parseFloat(cols[1]);
            if (!isNaN(rating) && rating > 0) { sum += rating; count++; }
          });
          const avg = count > 0 ? (sum / count).toFixed(1) : "0.0";
          setCsvStatsMap((prev) => ({ ...prev, [r.productId]: { avg, count } }));
        })
        .catch(() => {});
    });
  }, [rows]);

  // Close confirm box after deletion completes
  useEffect(() => {
    if (!isDeleting) setConfirmingId(null);
  }, [isDeleting]);

  const openStorefront = (productGid) => {
    if (!shopDomain) return;
    const p = (products || []).find((x) => x.id === productGid);
    if (!p?.handle) return;
    window.open(`https://${shopDomain}/products/${p.handle}`, "_blank", "noopener,noreferrer");
  };

  const openAdmin = (productGid) => {
    if (!shopDomain) return;
    const numericId   = getNumericProductId(productGid);
    if (!numericId) return;
    const storeHandle = shopDomain.replace(".myshopify.com", "");
    window.open(`https://admin.shopify.com/store/${storeHandle}/products/${numericId}`, "_blank", "noopener,noreferrer");
  };

  const btnStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    borderRadius: 8,
    border: "1px solid #c9cccf",
    background: "#fff",
    color: "#202223",
    cursor: "pointer",
  };

  return (
    <div style={{ border: "1px solid #e1e3e5", borderRadius: 10, background: "#fff", overflow: "hidden" }}>
      <div style={{ padding: 14, borderBottom: "1px solid #e1e3e5", fontWeight: 700, fontSize: 14 }}>
        Attached CSVs ({(rows || []).length})
      </div>

      <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
        {(rows || []).length === 0 ? (
          <div style={{ padding: 14, color: "#6d7175", fontSize: 13 }}>
            No product CSVs yet.
          </div>
        ) : (
          rows.map((r) => {
            const isAuto      = r.ratingSource === "auto";
            const rating      = parseFloat(r.rating?.toString() || "0").toFixed(1);
            const reviewCount = parseInt(r.reviewCount?.toString() || "0");
            const hasRating   = parseFloat(r.rating?.toString() || "0") > 0;
            const isSelected  = r.productId === selectedProductId;

            return (
              <div
                key={r.id}
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid #f1f2f3",
                  background: isSelected ? "#f6f6f7" : "#fff",
                  borderLeft: isSelected ? "3px solid #202223" : "3px solid transparent",
                  transition: "background 0.15s",
                }}
              >
                {/* Clickable area */}
                <div
                  onClick={() => onSelect(r.productId)}
                  style={{ cursor: "pointer" }}
                  title="Click to load into form"
                >
                  {/* Product title */}
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 5, color: "#202223" }}>
                    {r.productTitle}
                  </div>

                  {/* Rating + review count */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                    {isAuto ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          background: "#f0fdf4", border: "1px solid #bbf7d0",
                          borderRadius: 6, padding: "2px 8px", fontSize: 12, color: "#15803d", fontWeight: 600
                        }}>⚡ Auto</span>
                        {csvStatsMap[r.productId] ? (
                          <>
                            <StarIcon />
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#202223" }}>{csvStatsMap[r.productId].avg}</span>
                            <span style={{ fontSize: 12, color: "#6d7175" }}>({csvStatsMap[r.productId].count} reviews)</span>
                          </>
                        ) : (
                          <span style={{ fontSize: 12, color: "#6d7175" }}>loading…</span>
                        )}
                      </div>
                    ) : (
                      <>
                        <StarIcon />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#202223" }}>
                          {hasRating ? rating : "—"}
                        </span>
                        <span style={{ fontSize: 12, color: "#6d7175" }}>
                          {reviewCount > 0 ? `(${reviewCount} reviews)` : "(no reviews set)"}
                        </span>
                      </>
                    )}
                  </div>

                  {/* CSV URL */}
                  <div style={{ fontSize: 11, color: "#6d7175", wordBreak: "break-all", lineHeight: 1.4 }}>
                    {r.csvUrl}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openStorefront(r.productId); }}
                    title="View on storefront"
                    style={btnStyle}
                  >
                    <EyeIcon />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openAdmin(r.productId); }}
                    title="Open in Shopify Admin"
                    style={btnStyle}
                  >
                    <GearIcon />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setConfirmingId(r.productId); }}
                    title="Remove this product CSV"
                    style={{ ...btnStyle, color: "#d72c0d", borderColor: "#fead9a" }}
                  >
                    <TrashIcon />
                  </button>
                </div>

                {/* Inline confirm */}
                {confirmingId === r.productId && (
                  <div style={{ marginTop: 10, background: "#fff4f4", border: "1px solid #fead9a", borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#d72c0d", marginBottom: 8 }}>
                      Remove "{r.productTitle}"?
                    </div>
                    <div style={{ fontSize: 12, color: "#6d7175", marginBottom: 10 }}>
                      This will delete the CSV, rating and review count. Cannot be undone.
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDelete && onDelete(r.productId, r.productTitle); }}
                        disabled={isDeleting}
                        style={{ flex: 1, padding: "7px 0", background: "#d72c0d", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                      >
                        {isDeleting ? (
                          <>
                            <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.4)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "rg-spin 0.7s linear infinite" }} />
                            Removing…
                          </>
                        ) : "Yes, Remove"}
                      </button>
                      <style>{`@keyframes rg-spin { to { transform: rotate(360deg); } }`}</style>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setConfirmingId(null); }}
                        style={{ flex: 1, padding: "7px 0", background: "#fff", color: "#333", border: "1px solid #c9cccf", borderRadius: 6, fontSize: 13, cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
