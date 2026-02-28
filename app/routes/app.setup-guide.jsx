import { boundary } from "@shopify/shopify-app-react-router/server";

const stepCard = {
  background: "#fff",
  border: "1px solid #e1e3e5",
  borderRadius: 12,
  padding: "24px 28px",
  marginBottom: 16,
};

const stepNumber = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: "#111",
  color: "#fff",
  fontWeight: 700,
  fontSize: 14,
  marginRight: 12,
  flexShrink: 0,
};

const stepTitle = {
  display: "flex",
  alignItems: "center",
  fontWeight: 700,
  fontSize: 16,
  color: "#111",
  marginBottom: 12,
};

const stepBody = {
  fontSize: 14,
  color: "#4a4a4a",
  lineHeight: 1.7,
  marginLeft: 44,
};

const code = {
  background: "#f3f4f6",
  borderRadius: 4,
  padding: "2px 7px",
  fontFamily: "monospace",
  fontSize: 13,
  color: "#111",
};

const link = {
  color: "#2563eb",
  textDecoration: "underline",
  cursor: "pointer",
};

const tag = {
  display: "inline-block",
  background: "#f0fdf4",
  color: "#15803d",
  border: "1px solid #bbf7d0",
  borderRadius: 6,
  padding: "2px 10px",
  fontSize: 12,
  fontWeight: 600,
  marginRight: 6,
  marginBottom: 4,
};

export default function SetupGuide() {
  return (
    <s-page heading="Setup Guide">

      {/* ── Intro ── */}
      <s-section heading="Welcome to BrandsBro Reviews 👋">
        <s-paragraph>
          Follow these steps to get your review gallery live on your store. It takes about 10 minutes.
        </s-paragraph>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <span style={tag}>Step 1 — Google Sheet</span>
          <span style={tag}>Step 2 — Publish CSV</span>
          <span style={tag}>Step 3 — Apps Script</span>
          <span style={tag}>Step 4 — App Settings</span>
          <span style={tag}>Step 5 — Add to Theme</span>
        </div>
      </s-section>

      {/* ── Step 1 ── */}
      <s-section heading="Step 1 — Create your Google Sheet">
        <div style={stepCard}>
          <div style={stepTitle}>
            <span style={stepNumber}>1</span>
            Create a new Google Sheet with these exact columns in row 1
          </div>
          <div style={stepBody}>
            <p>Go to <a href="https://sheets.google.com" target="_blank" rel="noreferrer" style={link}>sheets.google.com</a> and create a new spreadsheet.</p>
            <p style={{ marginTop: 10 }}>Add these column headers in row 1 in this exact order:</p>

            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    {["A", "B", "C", "D", "E", "F", "G", "H", "I"].map((col) => (
                      <th key={col} style={{ padding: "6px 12px", border: "1px solid #e1e3e5", fontWeight: 700, textAlign: "center" }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {["product", "rating", "author", "email", "body", "date", "photo_url", "verified", "variant"].map((h) => (
                      <td key={h} style={{ padding: "6px 12px", border: "1px solid #e1e3e5", fontFamily: "monospace", fontSize: 12, textAlign: "center" }}>{h}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <p style={{ marginTop: 12 }}>Then add your reviews starting from row 2. Example:</p>
            <div style={{ overflowX: "auto", marginTop: 8 }}>
              <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
                <tbody>
                  <tr style={{ background: "#fafafa" }}>
                    <td style={{ padding: "5px 10px", border: "1px solid #e1e3e5" }}>My Product</td>
                    <td style={{ padding: "5px 10px", border: "1px solid #e1e3e5" }}>5</td>
                    <td style={{ padding: "5px 10px", border: "1px solid #e1e3e5" }}>Sarah M.</td>
                    <td style={{ padding: "5px 10px", border: "1px solid #e1e3e5" }}>sarah@email.com</td>
                    <td style={{ padding: "5px 10px", border: "1px solid #e1e3e5" }}>Absolutely love it!</td>
                    <td style={{ padding: "5px 10px", border: "1px solid #e1e3e5" }}>2024-01-15</td>
                    <td style={{ padding: "5px 10px", border: "1px solid #e1e3e5" }}>https://...</td>
                    <td style={{ padding: "5px 10px", border: "1px solid #e1e3e5" }}>TRUE</td>
                    <td style={{ padding: "5px 10px", border: "1px solid #e1e3e5" }}>Size M</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p style={{ marginTop: 12, color: "#6d7175", fontSize: 13 }}>
              💡 <strong>photo_url</strong> — paste a direct image URL (optional). Leave blank if no photo.<br />
              💡 <strong>verified</strong> — type <span style={code}>TRUE</span> or <span style={code}>FALSE</span>.<br />
              💡 <strong>variant</strong> — the product variant purchased (optional).
            </p>
          </div>
        </div>
      </s-section>

      {/* ── Step 2 ── */}
      <s-section heading="Step 2 — Publish your sheet as a CSV">
        <div style={stepCard}>
          <div style={stepTitle}>
            <span style={stepNumber}>2</span>
            Publish to web as CSV so the gallery can read it
          </div>
          <div style={stepBody}>
            <ol style={{ paddingLeft: 20, marginTop: 0 }}>
              <li style={{ marginBottom: 8 }}>In your Google Sheet, click <strong>File</strong> → <strong>Share</strong> → <strong>Publish to web</strong></li>
              <li style={{ marginBottom: 8 }}>In the first dropdown select your sheet tab (e.g. <span style={code}>Sheet1</span>)</li>
              <li style={{ marginBottom: 8 }}>In the second dropdown select <strong>Comma-separated values (.csv)</strong></li>
              <li style={{ marginBottom: 8 }}>Click <strong>Publish</strong> and confirm</li>
              <li style={{ marginBottom: 8 }}>Copy the link — it will look like:<br />
                <span style={{ ...code, display: "inline-block", marginTop: 6, wordBreak: "break-all" }}>
                  https://docs.google.com/spreadsheets/d/e/XXXXX/pub?output=csv
                </span>
              </li>
            </ol>
            <p style={{ marginTop: 8, color: "#6d7175", fontSize: 13 }}>
              💡 This link is what you paste in the <strong>Dashboard</strong> (global) or <strong>Product Reviews</strong> (per product) pages.
            </p>
          </div>
        </div>
      </s-section>

      {/* ── Step 3 ── */}
      <s-section heading="Step 3 — Set up Google Apps Script (for Write a Review form)">
        <div style={stepCard}>
          <div style={stepTitle}>
            <span style={stepNumber}>3</span>
            Create an Apps Script to receive review submissions
          </div>
          <div style={stepBody}>
            <p>This lets customers submit reviews directly from your storefront and saves them to your Google Sheet automatically.</p>

            <ol style={{ paddingLeft: 20, marginTop: 12 }}>
              <li style={{ marginBottom: 8 }}>In your Google Sheet click <strong>Extensions</strong> → <strong>Apps Script</strong></li>
              <li style={{ marginBottom: 8 }}>Delete any existing code and paste this:</li>
            </ol>

            <div style={{ background: "#1e1e1e", borderRadius: 8, padding: "16px 20px", marginTop: 4, marginBottom: 12, overflowX: "auto" }}>
              <pre style={{ margin: 0, color: "#d4d4d4", fontSize: 12, lineHeight: 1.6, fontFamily: "monospace" }}>{`function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  let csv = data.map(row => 
    row.map(cell => {
      const str = String(cell);
      // Wrap in quotes if contains comma, newline or quote
      if(str.includes(',') || str.includes('\n') || str.includes('"')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }).join(',')
  ).join('\n');

  return ContentService
    .createTextOutput(csv)
    .setMimeType(ContentService.MimeType.CSV);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    sheet.appendRow([
      data.product || '',
      data.rating  || '',
      data.author  || '',
      data.email   || '',
      data.body    || '',
      data.date    || '',
      '',
      'FALSE',
      ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`}</pre>
            </div>

            <ol start={3} style={{ paddingLeft: 20 }}>
              <li style={{ marginBottom: 8 }}>Click <strong>Deploy</strong> → <strong>New deployment</strong></li>
              <li style={{ marginBottom: 8 }}>Select type: <strong>Web app</strong></li>
              <li style={{ marginBottom: 8 }}>Set <strong>Execute as</strong>: Me</li>
              <li style={{ marginBottom: 8 }}>Set <strong>Who has access</strong>: Anyone</li>
              <li style={{ marginBottom: 8 }}>Click <strong>Deploy</strong> and copy the Web App URL</li>
            </ol>

            <p style={{ marginTop: 8, color: "#6d7175", fontSize: 13 }}>
              💡 Paste this Web App URL in the <strong>Dashboard → Write a Review Form → Submission Endpoint URL</strong>.<br />
              💡 New reviews will be added as <span style={code}>FALSE</span> (unverified) — you can manually change them to <span style={code}>TRUE</span> after reviewing.
            </p>
          </div>
        </div>
      </s-section>

      {/* ── Step 4 ── */}
      <s-section heading="Step 4 — Configure your app settings">
        <div style={stepCard}>
          <div style={stepTitle}>
            <span style={stepNumber}>4</span>
            Set up your gallery in the app
          </div>
          <div style={stepBody}>
            <p><strong>For a global gallery</strong> (same reviews on all pages):</p>
            <ol style={{ paddingLeft: 20, marginTop: 8 }}>
              <li style={{ marginBottom: 6 }}>Go to <strong>Dashboard</strong> in the left nav</li>
              <li style={{ marginBottom: 6 }}>Paste your CSV link in <strong>Data Source</strong></li>
              <li style={{ marginBottom: 6 }}>Set your average rating and review count</li>
              <li style={{ marginBottom: 6 }}>Customize colors, layout, features as you like</li>
              <li style={{ marginBottom: 6 }}>Hit <strong>Save All Settings</strong></li>
            </ol>

            <p style={{ marginTop: 16 }}><strong>For per-product galleries</strong> (different reviews per product):</p>
            <ol style={{ paddingLeft: 20, marginTop: 8 }}>
              <li style={{ marginBottom: 6 }}>Go to <strong>Product Reviews</strong> in the left nav</li>
              <li style={{ marginBottom: 6 }}>Select a product from the dropdown</li>
              <li style={{ marginBottom: 6 }}>Paste that product's CSV link</li>
              <li style={{ marginBottom: 6 }}>Set the product's rating and review count</li>
              <li style={{ marginBottom: 6 }}>Hit <strong>Save Product CSV & Rating</strong></li>
            </ol>
          </div>
        </div>
      </s-section>

      {/* ── Step 5 ── */}
      <s-section heading="Step 5 — Add the gallery to your theme">
        <div style={stepCard}>
          <div style={stepTitle}>
            <span style={stepNumber}>5</span>
            Add the gallery block to your product page
          </div>
          <div style={stepBody}>
            <ol style={{ paddingLeft: 20, marginTop: 0 }}>
              <li style={{ marginBottom: 8 }}>In Shopify admin go to <strong>Online Store</strong> → <strong>Themes</strong></li>
              <li style={{ marginBottom: 8 }}>Click <strong>Customize</strong> on your active theme</li>
              <li style={{ marginBottom: 8 }}>Navigate to a <strong>Product page</strong> template</li>
              <li style={{ marginBottom: 8 }}>Click <strong>Add section</strong> and search for <strong>CSV BrandsBro Reviews</strong></li>
              <li style={{ marginBottom: 8 }}>Add it and position it where you want on the page</li>
              <li style={{ marginBottom: 8 }}>Adjust spacing/padding in the section settings if needed</li>
              <li style={{ marginBottom: 8 }}>Click <strong>Save</strong></li>
            </ol>
            <p style={{ marginTop: 8, color: "#6d7175", fontSize: 13 }}>
              💡 The gallery will automatically pull reviews from your CSV and display them with all the settings you configured in the Dashboard.
            </p>
          </div>
        </div>
      </s-section>

      {/* ── Done ── */}
      <s-section heading="🎉 You're all set!">
        <s-paragraph>
          Your review gallery is now live. Any time you add new rows to your Google Sheet the gallery will automatically show them on your next page load.
        </s-paragraph>
        <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="/app" style={{ textDecoration: "none" }}>
            <s-button variant="primary">Go to Dashboard →</s-button>
          </a>
          <a href="/app/product-reviews" style={{ textDecoration: "none" }}>
            <s-button>Set up Product Reviews →</s-button>
          </a>
        </div>
      </s-section>

    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
