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

  const setting = await prismaRetry(() =>
    prisma.setting.findUnique({ where: { shop: session.shop } })
  );

  return {
    // Data source
    csvUrl: setting?.csvUrl || "",

    // Content
    heading: setting?.heading || "Customer Reviews",

    // Colors
    starColor:          setting?.starColor          || "#FFC107",
    bgColor:            setting?.bgColor            || "#f8f9fa",
    cardBgColor:        setting?.cardBgColor        || "#ffffff",
    textColor:          setting?.textColor          || "#333333",
    buttonBg:           setting?.buttonBg           || "#111111",
    buttonText:         setting?.buttonText         || "#ffffff",
    verifiedBadgeColor: setting?.verifiedBadgeColor || "#4CAF50",
    formAccentColor:    setting?.formAccentColor    || "#111111",

    // Layout
    cardLayout:     setting?.cardLayout     || "masonry",
    columnsDesktop: setting?.columnsDesktop ?? 4,
    columnsMobile:  setting?.columnsMobile  ?? 1,

    // Load counts
    initialLoadCount: setting?.initialLoadCount ?? 12,
    loadMoreCount:    setting?.loadMoreCount    ?? 12,

    // Feature toggles
    showVerifiedBadge:  setting?.showVerifiedBadge  ?? true,
    showSearch:         setting?.showSearch         ?? true,
    showFilters:        setting?.showFilters        ?? true,
    showSorting:        setting?.showSorting        ?? true,
    showLightbox:       setting?.showLightbox       ?? true,
    showLoadMore:       setting?.showLoadMore       ?? true,
    showWriteReviewBtn: setting?.showWriteReviewBtn ?? true,

    // Write a review form
    formTitle:      setting?.formTitle      || "Share Your Experience",
    formSubtitle:   setting?.formSubtitle   || "Your honest review helps other customers make better decisions.",
    formSuccessMsg: setting?.formSuccessMsg || "Thank you for your review! It will appear shortly after approval.",
    formSubmitUrl:  setting?.formSubmitUrl  || "",

    // Rating summary (global fallback)
    globalRating:       parseFloat(setting?.globalRating      || 0),
    globalReviewCount:  parseInt(  setting?.globalReviewCount || 0),
    globalRatingSource: setting?.globalRatingSource || 'manual',
  };
};

// ─── ACTION ──────────────────────────────────────────────────────────────────
export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent !== "save_settings") {
    return { success: false, error: "Unknown action." };
  }

  const settingsData = {
    // Data source
    csvUrl: formData.get("csvUrl") || "",

    // Content
    heading: formData.get("heading") || "Customer Reviews",

    // Colors
    starColor:          formData.get("starColor")          || "#FFC107",
    bgColor:            formData.get("bgColor")            || "#f8f9fa",
    cardBgColor:        formData.get("cardBgColor")        || "#ffffff",
    textColor:          formData.get("textColor")          || "#333333",
    buttonBg:           formData.get("buttonBg")           || "#111111",
    buttonText:         formData.get("buttonText")         || "#ffffff",
    verifiedBadgeColor: formData.get("verifiedBadgeColor") || "#4CAF50",
    formAccentColor:    formData.get("formAccentColor")    || "#111111",

    // Layout
    cardLayout:     formData.get("cardLayout")     || "masonry",
    columnsDesktop: parseInt(formData.get("columnsDesktop") || "4"),
    columnsMobile:  parseInt(formData.get("columnsMobile")  || "1"),

    // Load counts
    initialLoadCount: parseInt(formData.get("initialLoadCount") || "12"),
    loadMoreCount:    parseInt(formData.get("loadMoreCount")    || "12"),

    // Feature toggles
    showVerifiedBadge:  formData.get("showVerifiedBadge")  === "true",
    showSearch:         formData.get("showSearch")         === "true",
    showFilters:        formData.get("showFilters")        === "true",
    showSorting:        formData.get("showSorting")        === "true",
    showLightbox:       formData.get("showLightbox")       === "true",
    showLoadMore:       formData.get("showLoadMore")       === "true",
    showWriteReviewBtn: formData.get("showWriteReviewBtn") === "true",

    // Write a review form
    formTitle:      formData.get("formTitle")      || "Share Your Experience",
    formSubtitle:   formData.get("formSubtitle")   || "Your honest review helps other customers make better decisions.",
    formSuccessMsg: formData.get("formSuccessMsg") || "Thank you for your review! It will appear shortly after approval.",
    formSubmitUrl:  formData.get("formSubmitUrl")  || "",

    // Rating summary (global fallback)
    globalRating:       parseFloat(formData.get("globalRating")       || "0"),
    globalReviewCount:  parseInt(  formData.get("globalReviewCount")  || "0"),
    globalRatingSource: formData.get("globalRatingSource") || "manual",
  };

  // Save to DB
  await prismaRetry(() =>
    prisma.setting.upsert({
      where:  { shop: session.shop },
      update: settingsData,
      create: { shop: session.shop, ...settingsData },
    })
  );

  // Sync ALL settings to shop metafield as JSON
  const shopResponse = await admin.graphql(`{ shop { id } }`);
  const shopJson     = await shopResponse.json();
  const shopId       = shopJson.data.shop.id;

  await admin.graphql(
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
            ownerId:   shopId,
            namespace: "review_gallery",
            key:       "settings",
            type:      "json",
            value:     JSON.stringify(settingsData),
          },
        ],
      },
    }
  );

  return { success: true, toast: "Settings saved!" };
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
const label  = { display: "block", fontWeight: 600, marginBottom: 6, color: "#202223", fontSize: 13 };
const input  = { width: "100%", padding: "8px 12px", borderRadius: 4, border: "1px solid #c9cccf", fontSize: 14, marginBottom: 20, boxSizing: "border-box" };
const divider = { borderBottom: "1px solid #e1e3e5", marginBottom: 20, marginTop: 4 };

function ColorField({ label: lbl, value, onChange }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={label}>{lbl}</label>
      <div style={{ display: "flex", gap: 10 }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 50, height: 38, padding: 2, border: "1px solid #c9cccf", borderRadius: 4, cursor: "pointer" }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...input, marginBottom: 0, flex: 1 }}
        />
      </div>
    </div>
  );
}

function Toggle({ label: lbl, checked, onChange, hint }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 14 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 18, height: 18, cursor: "pointer", marginTop: 1, flexShrink: 0 }}
      />
      <div>
        <div style={{ fontWeight: 500, fontSize: 14 }}>{lbl}</div>
        {hint && <div style={{ fontSize: 12, color: "#6d7175", marginTop: 2 }}>{hint}</div>}
      </div>
    </label>
  );
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export default function Index() {
  const shopify    = useAppBridge();
  const data       = useLoaderData();
  const actionData = useActionData();
  const submit     = useSubmit();
  const [isSaving, setIsSaving] = useState(false);

  // Data source
  const [csvUrl, setCsvUrl] = useState(data.csvUrl);

  // Content
  const [heading, setHeading] = useState(data.heading);

  // Colors
  const [starColor,          setStarColor]          = useState(data.starColor);
  const [bgColor,            setBgColor]            = useState(data.bgColor);
  const [cardBgColor,        setCardBgColor]        = useState(data.cardBgColor);
  const [textColor,          setTextColor]          = useState(data.textColor);
  const [buttonBg,           setButtonBg]           = useState(data.buttonBg);
  const [buttonText,         setButtonText]         = useState(data.buttonText);
  const [verifiedBadgeColor, setVerifiedBadgeColor] = useState(data.verifiedBadgeColor);
  const [formAccentColor,    setFormAccentColor]    = useState(data.formAccentColor);

  // Layout
  const [cardLayout,     setCardLayout]     = useState(data.cardLayout);
  const [columnsDesktop, setColumnsDesktop] = useState(data.columnsDesktop);
  const [columnsMobile,  setColumnsMobile]  = useState(data.columnsMobile);

  // Load counts
  const [initialLoadCount, setInitialLoadCount] = useState(data.initialLoadCount);
  const [loadMoreCount,    setLoadMoreCount]    = useState(data.loadMoreCount);

  // Feature toggles
  const [showVerifiedBadge,  setShowVerifiedBadge]  = useState(data.showVerifiedBadge);
  const [showSearch,         setShowSearch]         = useState(data.showSearch);
  const [showFilters,        setShowFilters]        = useState(data.showFilters);
  const [showSorting,        setShowSorting]        = useState(data.showSorting);
  const [showLightbox,       setShowLightbox]       = useState(data.showLightbox);
  const [showLoadMore,       setShowLoadMore]       = useState(data.showLoadMore);
  const [showWriteReviewBtn, setShowWriteReviewBtn] = useState(data.showWriteReviewBtn);

  // Write a review form
  const [formTitle,      setFormTitle]      = useState(data.formTitle);
  const [formSubtitle,   setFormSubtitle]   = useState(data.formSubtitle);
  const [formSuccessMsg, setFormSuccessMsg] = useState(data.formSuccessMsg);
  const [formSubmitUrl,  setFormSubmitUrl]  = useState(data.formSubmitUrl);

  // Rating summary
  const [globalRating,       setGlobalRating]       = useState(data.globalRating);
  const [globalReviewCount,  setGlobalReviewCount]  = useState(data.globalReviewCount);
  const [globalRatingSource, setGlobalRatingSource] = useState(data.globalRatingSource);
  const [csvStats,           setCsvStats]           = useState(null);
  const [csvStatsLoading,    setCsvStatsLoading]    = useState(false);

  useEffect(() => {
    if (actionData?.toast) { shopify.toast.show(actionData.toast); setIsSaving(false); }
    if (actionData?.error) { shopify.toast.show(actionData.error); setIsSaving(false); }
  }, [actionData, shopify]);

  // Fetch global CSV to calculate stats in auto mode
  useEffect(() => {
    setCsvStats(null);
    if (globalRatingSource !== "auto" || !csvUrl) return;

    setCsvStatsLoading(true);
    const sep = csvUrl.includes("?") ? "&" : "?";
    fetch(csvUrl + sep + "t=" + Date.now())
      .then((r) => r.text())
      .then((text) => {
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
        lines.shift();
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
  }, [globalRatingSource, csvUrl]);

  const handleSave = () => {
    setIsSaving(true);
    submit(
      {
        intent: "save_settings",

        csvUrl,
        heading,

        starColor,
        bgColor,
        cardBgColor,
        textColor,
        buttonBg,
        buttonText,
        verifiedBadgeColor,
        formAccentColor,

        cardLayout,
        columnsDesktop: String(columnsDesktop),
        columnsMobile:  String(columnsMobile),

        initialLoadCount: String(initialLoadCount),
        loadMoreCount:    String(loadMoreCount),

        showVerifiedBadge:  String(showVerifiedBadge),
        showSearch:         String(showSearch),
        showFilters:        String(showFilters),
        showSorting:        String(showSorting),
        showLightbox:       String(showLightbox),
        showLoadMore:       String(showLoadMore),
        showWriteReviewBtn: String(showWriteReviewBtn),

        formTitle,
        formSubtitle,
        formSuccessMsg,
        formSubmitUrl,

        globalRating:       String(globalRating),
        globalReviewCount:  String(globalReviewCount),
        globalRatingSource,
      },
      { method: "POST" }
    );
  };

  return (
    <s-page heading="BrandsBro Reviews — Dashboard">

      {/* ── 1. DATA SOURCE ─────────────────────────────────── */}
      <s-section heading="1. Data Source (Global)">
        <s-paragraph>
          Global CSV for the whole shop. If you use per-product CSVs you may leave this blank.
        </s-paragraph>
        <label style={label}>Google Sheets CSV Link</label>
        <input
          type="url"
          placeholder="https://docs.google.com/spreadsheets/..."
          value={csvUrl}
          onChange={(e) => setCsvUrl(e.target.value)}
          style={input}
        />
      </s-section>

      {/* ── 2. RATING SUMMARY (GLOBAL) ─────────────────────── */}
      <s-section heading="2. Rating Summary (Global)">
        <s-paragraph>
          Fallback rating shown on any page that doesn't have a per-product rating set.
        </s-paragraph>

        {/* Toggle */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {["auto", "manual"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setGlobalRatingSource(opt)}
              style={{
                padding: "8px 20px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                border: globalRatingSource === opt ? "2px solid #111" : "1px solid #c9cccf",
                background: globalRatingSource === opt ? "#111" : "#fff",
                color: globalRatingSource === opt ? "#fff" : "#333",
              }}
            >
              {opt === "auto" ? "⚡ Auto-calculate from CSV" : "✏️ Manual"}
            </button>
          ))}
        </div>

        {globalRatingSource === "auto" ? (
          <div style={{ padding: "14px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, fontSize: 13, color: "#15803d" }}>
            ✅ Rating and review count will be automatically calculated from your CSV data each time the gallery loads. No manual input needed.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={label}>Average Rating (e.g. 4.8)</label>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={globalRating}
                onChange={(e) => { const val = parseFloat(e.target.value) || 0; setGlobalRating(Math.min(5, Math.max(0, val))); }}
                style={input}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>Total Review Count (e.g. 124)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={globalReviewCount}
                onChange={(e) => setGlobalReviewCount(parseInt(e.target.value) || 0)}
                style={input}
              />
            </div>
          </div>
        )}

        {/* Live Preview */}
        <div style={{ marginTop: 16, padding: "16px 20px", background: "#f8f9fa", border: "1px solid #e1e3e5", borderRadius: 10 }}>
          <div style={{ fontSize: 11, color: "#6d7175", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Preview
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Stars */}
            <div style={{ display: "flex", gap: 2 }}>
              {[1,2,3,4,5].map((star) => {
                const r = globalRatingSource === "auto" ? 5 : globalRating;
                const filled = star <= Math.floor(r);
                const half   = !filled && star === Math.ceil(r) && r % 1 >= 0.3;
                return (
                  <svg key={star} width="18" height="18" viewBox="0 0 24 24">
                    <defs>
                      <linearGradient id={"sg" + star}>
                        <stop offset={filled ? "100%" : half ? "50%" : "0%"} stopColor={starColor} />
                        <stop offset={filled ? "100%" : half ? "50%" : "0%"} stopColor="#e1e3e5" />
                      </linearGradient>
                    </defs>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={filled ? starColor : half ? "url(#sg"+star+")" : "#e1e3e5"} />
                  </svg>
                );
              })}
            </div>
            {globalRatingSource === "auto" ? (
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
                <span style={{ fontSize: 14, fontWeight: 700, color: "#202223" }}>{parseFloat(globalRating).toFixed(1)}</span>
                <span style={{ fontSize: 13, color: "#6d7175" }}>({globalReviewCount} reviews)</span>
              </>
            )}
          </div>
        </div>
      </s-section>

      {/* ── 3. CONTENT ─────────────────────────────────────── */}
      <s-section heading="3. Content">
        <label style={label}>Gallery Heading Text</label>
        <input
          type="text"
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          style={input}
        />
      </s-section>

      {/* ── 3. COLORS ──────────────────────────────────────── */}
      <s-section heading="4. Colors">
        <ColorField label="Star Color"              value={starColor}          onChange={setStarColor} />
        <ColorField label="Section Background"      value={bgColor}            onChange={setBgColor} />
        <ColorField label="Card Background"         value={cardBgColor}        onChange={setCardBgColor} />
        <ColorField label="Text Color"              value={textColor}          onChange={setTextColor} />
        <ColorField label="Button Background"       value={buttonBg}           onChange={setButtonBg} />
        <ColorField label="Button Text"             value={buttonText}         onChange={setButtonText} />
        <ColorField label="Verified Badge Color"    value={verifiedBadgeColor} onChange={setVerifiedBadgeColor} />
        <ColorField label="Review Form Accent Color" value={formAccentColor}   onChange={setFormAccentColor} />
      </s-section>

      {/* ── 4. LAYOUT ──────────────────────────────────────── */}
      <s-section heading="5. Layout">
        <label style={label}>Card Layout Style</label>
        <select value={cardLayout} onChange={(e) => setCardLayout(e.target.value)} style={input}>
          <option value="masonry">Masonry — cards stack and fill spaces</option>
          <option value="natural">Natural Height — cards use content height</option>
          <option value="equal">Equal Height — all cards same height</option>
        </select>

        <div style={{ display: "flex", gap: 20 }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Desktop Columns</label>
            <select value={columnsDesktop} onChange={(e) => setColumnsDesktop(Number(e.target.value))} style={input}>
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n} Columns</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Mobile Columns</label>
            <select value={columnsMobile} onChange={(e) => setColumnsMobile(Number(e.target.value))} style={input}>
              <option value={1}>1 Column</option>
              <option value={2}>2 Columns</option>
            </select>
          </div>
        </div>
      </s-section>

      {/* ── 5. LOAD SETTINGS ───────────────────────────────── */}
      <s-section heading="6. Load Settings">
        <div style={{ display: "flex", gap: 20 }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Initial Reviews to Show</label>
            <select value={initialLoadCount} onChange={(e) => setInitialLoadCount(Number(e.target.value))} style={input}>
              {[4, 8, 12, 16, 20, 24, 36, 48].map((n) => (
                <option key={n} value={n}>{n} Reviews</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Reviews per "Load More" Click</label>
            <select value={loadMoreCount} onChange={(e) => setLoadMoreCount(Number(e.target.value))} style={input}>
              {[4, 8, 12, 16, 20, 24].map((n) => (
                <option key={n} value={n}>{n} Reviews</option>
              ))}
            </select>
          </div>
        </div>
      </s-section>

      {/* ── 6. FEATURES ────────────────────────────────────── */}
      <s-section heading="7. Features">
        <Toggle label="Show Search Bar"            checked={showSearch}         onChange={setShowSearch}         hint="Let visitors search through reviews" />
        <Toggle label="Show Star Filters"          checked={showFilters}        onChange={setShowFilters}        hint="Filter reviews by star rating" />
        <Toggle label="Show Sort Dropdown"         checked={showSorting}        onChange={setShowSorting}        hint="Sort by newest, highest, lowest rating" />
        <Toggle label="Show Verified Badges"       checked={showVerifiedBadge}  onChange={setShowVerifiedBadge}  hint="Show verified/unverified badge on each review" />
        <Toggle label="Enable Image/Video Popup"   checked={showLightbox}       onChange={setShowLightbox}       hint="Click photo to open full-screen lightbox" />
        <Toggle label="Show Load More Button"      checked={showLoadMore}       onChange={setShowLoadMore}       hint="Load reviews in batches instead of all at once" />
        <Toggle label="Show Write a Review Button" checked={showWriteReviewBtn} onChange={setShowWriteReviewBtn} hint="Let customers submit reviews from the storefront" />
      </s-section>

      {/* ── 7. WRITE A REVIEW FORM ─────────────────────────── */}
      <s-section heading="8. Write a Review Form">
        <label style={label}>Form Title</label>
        <input
          type="text"
          value={formTitle}
          onChange={(e) => setFormTitle(e.target.value)}
          style={input}
        />

        <label style={label}>Form Subtitle</label>
        <input
          type="text"
          value={formSubtitle}
          onChange={(e) => setFormSubtitle(e.target.value)}
          style={input}
        />

        <label style={label}>Success Message (shown after submit)</label>
        <input
          type="text"
          value={formSuccessMsg}
          onChange={(e) => setFormSuccessMsg(e.target.value)}
          style={input}
        />

        <label style={label}>Form Submission Endpoint URL</label>
        <input
          type="url"
          placeholder="https://script.google.com/macros/s/..."
          value={formSubmitUrl}
          onChange={(e) => setFormSubmitUrl(e.target.value)}
          style={input}
        />
        <div style={{ fontSize: 12, color: "#6d7175", marginTop: -16, marginBottom: 20 }}>
          A Google Apps Script Web App URL or any POST endpoint that accepts the review data.
        </div>
      </s-section>

      {/* ── SAVE BUTTON ────────────────────────────────────── */}
      <div style={{ padding: "24px 0", textAlign: "right" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 24px", background: isSaving ? "#6d7175" : "#111",
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
          ) : "Save All Settings"}
        </button>
        <style>{`@keyframes rg-spin { to { transform: rotate(360deg); } }`}</style>
      </div>

    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
