export default function ProductCsvForm({
  products,
  selectedProductId,
  onChangeProductId,
  productCsvUrl,
  onChangeCsvUrl,
  onSave,
  currentAttachedUrl,
}) {
  const labelStyle = {
    display: "block",
    fontWeight: 600,
    marginBottom: 6,
    color: "#202223",
    fontSize: 13,
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 4,
    border: "1px solid #c9cccf",
    fontSize: 14,
    marginBottom: 20,
    boxSizing: "border-box",
  };

  return (
    <s-section heading="Attach CSV to a Product">
      <s-paragraph>Select a product and attach a CSV link for that specific product.</s-paragraph>

      <div style={{ marginTop: 15 }}>
        <label style={labelStyle}>Select Product</label>
        <select value={selectedProductId} onChange={(e) => onChangeProductId(e.target.value)} style={inputStyle}>
          <option value="">-- Choose a product --</option>
          {(products || []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>

        <label style={labelStyle}>CSV Link for this product</label>
        <input
          type="url"
          placeholder="https://docs.google.com/... (published CSV link)"
          value={productCsvUrl}
          onChange={(e) => onChangeCsvUrl(e.target.value)}
          style={inputStyle}
        />

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <s-button variant="primary" onClick={onSave}>
            Save Product CSV
          </s-button>
        </div>

        {selectedProductId && currentAttachedUrl ? (
          <div style={{ marginTop: 12, fontSize: 13, color: "#6d7175", wordBreak: "break-word" }}>
            Currently attached: {currentAttachedUrl}
          </div>
        ) : null}
      </div>
    </s-section>
  );
}
