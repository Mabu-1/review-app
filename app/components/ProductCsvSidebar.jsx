function getNumericProductId(gid) {
  if (!gid) return "";
  const parts = String(gid).split("/");
  return parts[parts.length - 1] || "";
}

function EyeIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function GearIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 15a7.9 7.9 0 0 0 .1-1l2-1.2-2-3.4-2.3.6a7.3 7.3 0 0 0-.8-.8l.6-2.3-3.4-2-1.2 2a7.9 7.9 0 0 0-2 0l-1.2-2-3.4 2 .6 2.3c-.3.2-.6.5-.8.8l-2.3-.6-2 3.4 2 1.2a7.9 7.9 0 0 0 0 2l-2 1.2 2 3.4 2.3-.6c.2.3.5.6.8.8l-.6 2.3 3.4 2 1.2-2a7.9 7.9 0 0 0 2 0l1.2 2 3.4-2-.6-2.3c.3-.2.6-.5.8-.8l2.3.6 2-3.4-2-1.2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ProductCsvSidebar({
  rows,
  selectedProductId,
  onSelect,
  shopDomain,
  products,
}) {
  const openStorefront = (productGid) => {
    if (!shopDomain) return;

    const p = (products || []).find((x) => x.id === productGid);
    if (!p?.handle) return;

    const url = `https://${shopDomain}/products/${p.handle}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openAdmin = (productGid) => {
    if (!shopDomain) return;
    const numericId = getNumericProductId(productGid);
    if (!numericId) return;

    const url = `https://${shopDomain}/admin/products/${numericId}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div style={{ border: "1px solid #e1e3e5", borderRadius: 10, background: "#fff", overflow: "hidden" }}>
      <div style={{ padding: 14, borderBottom: "1px solid #e1e3e5", fontWeight: 700, fontSize: 14 }}>
        Attached CSVs
      </div>

      <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
        {(rows || []).length === 0 ? (
          <div style={{ padding: 14, color: "#6d7175", fontSize: 13 }}>
            No product CSVs yet.
          </div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid #f1f2f3",
                background: r.productId === selectedProductId ? "#f6f6f7" : "#fff",
              }}
            >
              <div onClick={() => onSelect(r.productId)} style={{ cursor: "pointer" }} title="Click to load into form">
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#202223" }}>
                  {r.productTitle}
                </div>
                <div style={{ fontSize: 12, color: "#6d7175", wordBreak: "break-word" }}>
                  {r.csvUrl}
                </div>
              </div>

              {/* Buttons */}
              <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                {/* 👁 Storefront */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openStorefront(r.productId);
                  }}
                  title="View on storefront"
                  style={{
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
                  }}
                >
                  <EyeIcon />
                </button>

                {/* ⚙ Admin (optional) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openAdmin(r.productId);
                  }}
                  title="Open in Shopify Admin"
                  style={{
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
                  }}
                >
                  <GearIcon />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
