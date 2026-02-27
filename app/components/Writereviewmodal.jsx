import { useState, useEffect } from "react";

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

/**
 * WriteReviewModal
 *
 * Props:
 *  open              - boolean
 *  onClose           - () => void
 *  submitUrl         - string  (Google Apps Script web app URL)
 *  products          - array of { id, title, handle } (optional – for product picker)
 *  defaultProductHandle - string (pre-selected product handle, optional)
 */
export default function WriteReviewModal({
  open,
  onClose,
  submitUrl,
  products = [],
  defaultProductHandle = "",
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [author, setAuthor] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [productHandle, setProductHandle] = useState(defaultProductHandle);
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [errors, setErrors] = useState({});

  // Reset when opened
  useEffect(() => {
    if (open) {
      setRating(0);
      setHoverRating(0);
      setAuthor("");
      setEmail("");
      setBody("");
      setProductHandle(defaultProductHandle);
      setStatus("idle");
      setErrors({});
    }
  }, [open, defaultProductHandle]);

  if (!open) return null;

  const validate = () => {
    const e = {};
    if (!author.trim()) e.author = "Name is required.";
    if (!body.trim()) e.body = "Review text is required.";
    if (rating === 0) e.rating = "Please select a rating.";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email.";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    if (!submitUrl) {
      setStatus("error");
      return;
    }

    setStatus("submitting");

    const now = new Date();
    const reviewDate = now.toISOString().split("T")[0];

    const payload = {
      rating,
      author: author.trim(),
      email: email.trim(),
      body: body.trim(),
      date: reviewDate,
      product: productHandle || "",
      verified: false, // always false — merchant approves manually in Sheets
    };

    try {
      await fetch(submitUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
      });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  // ── Styles ───────────────────────────────────────────────────────
  const overlay = {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.55)",
    zIndex: 9999,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 20,
  };
  const box = {
    background: "#fff", borderRadius: 16,
    width: "100%", maxWidth: 520,
    maxHeight: "90vh", overflowY: "auto",
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
    position: "relative",
  };
  const topBar = {
    height: 5, borderRadius: "16px 16px 0 0",
    background: "linear-gradient(90deg, #111, #FFC107)",
  };
  const inner = { padding: "28px 32px 32px" };
  const label = { display: "block", fontWeight: 600, fontSize: 13, color: "#333", marginBottom: 6 };
  const input = {
    width: "100%", padding: "10px 14px",
    border: "1.5px solid #e5e7eb", borderRadius: 8,
    fontSize: 14, outline: "none", boxSizing: "border-box",
    fontFamily: "inherit", background: "#fafafa",
  };
  const inputError = { ...input, borderColor: "#e53e3e" };
  const errTxt = { fontSize: 12, color: "#e53e3e", marginTop: 4 };
  const fieldWrap = { marginBottom: 18 };

  const closeBtn = {
    position: "absolute", top: 16, right: 16,
    width: 32, height: 32, borderRadius: "50%",
    border: "none", background: "rgba(0,0,0,0.07)",
    cursor: "pointer", fontSize: 16,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#555",
  };

  const submitBtn = {
    width: "100%", padding: "13px 20px",
    background: "#111", color: "#fff",
    border: "none", borderRadius: 10,
    fontSize: 15, fontWeight: 700, cursor: "pointer",
    opacity: status === "submitting" ? 0.6 : 1,
    marginTop: 4,
  };

  const displayRating = hoverRating || rating;

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={box}>
        <div style={topBar} />
        <button style={closeBtn} onClick={onClose}>✕</button>

        <div style={inner}>
          {status === "success" ? (
            // ── Success State ──
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{
                width: 60, height: 60, borderRadius: "50%",
                background: "linear-gradient(135deg, #111, #FFC107)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px", fontSize: 26,
              }}>✓</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>Review Submitted!</div>
              <div style={{ fontSize: 14, color: "#666", lineHeight: 1.6, marginBottom: 24 }}>
                Thank you! Your review has been received and will appear after it's verified in Google Sheets.
              </div>
              <button style={{ ...submitBtn, width: "auto", padding: "12px 32px" }} onClick={onClose}>
                Close
              </button>
            </div>
          ) : (
            // ── Form State ──
            <>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#111", marginBottom: 6, paddingRight: 36 }}>
                Write a Review
              </div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 24, lineHeight: 1.5 }}>
                Submitted reviews will be unverified by default. Verify them manually in your Google Sheet.
              </div>

              {/* Product picker (only shown when products list is provided) */}
              {products.length > 0 && (
                <div style={fieldWrap}>
                  <label style={label}>Product</label>
                  <select
                    value={productHandle}
                    onChange={(e) => setProductHandle(e.target.value)}
                    style={input}
                  >
                    <option value="">-- Select product (optional) --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.handle}>{p.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Star rating */}
              <div style={fieldWrap}>
                <label style={label}>Rating *</label>
                <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => { setRating(s); setErrors((p) => ({ ...p, rating: undefined })); }}
                      style={{
                        fontSize: 32, background: "none", border: "none",
                        cursor: "pointer", padding: 0, lineHeight: 1,
                        color: s <= displayRating ? "#FFC107" : "#ddd",
                        transform: s <= displayRating ? "scale(1.1)" : "scale(1)",
                        transition: "color 0.15s, transform 0.15s",
                      }}
                    >★</button>
                  ))}
                </div>
                {displayRating > 0 && (
                  <div style={{ fontSize: 13, color: "#FFC107", fontWeight: 600, minHeight: 18 }}>
                    {STAR_LABELS[displayRating]}
                  </div>
                )}
                {errors.rating && <div style={errTxt}>{errors.rating}</div>}
              </div>

              {/* Name + Email row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                <div>
                  <label style={label}>Name *</label>
                  <input
                    style={errors.author ? inputError : input}
                    type="text" placeholder="e.g. Sarah M."
                    value={author}
                    onChange={(e) => { setAuthor(e.target.value); setErrors((p) => ({ ...p, author: undefined })); }}
                    maxLength={80}
                  />
                  {errors.author && <div style={errTxt}>{errors.author}</div>}
                </div>
                <div>
                  <label style={label}>Email <span style={{ fontWeight: 400, color: "#bbb", fontSize: 12 }}>(private)</span></label>
                  <input
                    style={errors.email ? inputError : input}
                    type="email" placeholder="you@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                  />
                  {errors.email && <div style={errTxt}>{errors.email}</div>}
                </div>
              </div>

              {/* Review body */}
              <div style={fieldWrap}>
                <label style={label}>Review *</label>
                <textarea
                  style={{
                    ...(errors.body ? inputError : input),
                    minHeight: 100, resize: "none", lineHeight: 1.6,
                  }}
                  placeholder="Tell us about your experience with this product…"
                  value={body}
                  onChange={(e) => { setBody(e.target.value); setErrors((p) => ({ ...p, body: undefined })); }}
                  maxLength={2000}
                />
                {errors.body && <div style={errTxt}>{errors.body}</div>}
              </div>

              {/* No submit URL warning */}
              {status === "error" && (
                <div style={{ padding: "10px 14px", background: "#FFF6F6", border: "1px solid #E0B4B4", borderRadius: 8, fontSize: 13, color: "#c0392b", marginBottom: 16 }}>
                  {!submitUrl
                    ? "No submission URL configured. Add a Google Apps Script URL in the Theme Editor."
                    : "Submission failed. Please try again."}
                </div>
              )}

              <button
                style={submitBtn}
                onClick={handleSubmit}
                disabled={status === "submitting"}
              >
                {status === "submitting" ? "Submitting…" : "Submit Review"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
