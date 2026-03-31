## ✅ Steps to get `SHEET_ID` and `API_KEY`, and make sheet readable

Excellent news: this is quick and fully doable. 2 minutes setup and your app can load live sheet data.

---

### 1. Get `SHEET_ID` from your Google Sheet URL

Open your sheet in browser. URL looks like:

`https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit#gid=0`

- Copy the `<SHEET_ID>` part only (long alphanumeric string).
- Paste into App.jsx:
  - `const SHEET_ID = 'your-sheet-id-here';`

---

### 2. Get `API_KEY` from Google Cloud Console

1. Visit: https://console.cloud.google.com/
2. Select or create a project (e.g., “Society-Portal”).
3. Enable API:
   - Go to `APIs & Services` → `Library`
   - Search `Google Sheets API` → Enable
4. Create credentials:
   - `APIs & Services` → `Credentials` → `Create credentials` → `API key`
   - Copy key shown.
5. Harden key (strongly recommended):
   - Click created key → `Application restrictions` → `HTTP referrers` → add `http://localhost:5173` (and your domain if deployed)
   - `API restrictions` → restrict to `Google Sheets API`
6. Paste into App.jsx:
   - `const API_KEY = 'your-api-key-here';`

---

### 3. Make sheet readable by API

Option A (easiest, works with API key):
- `Share` → `Anyone with link` → `Viewer`
- This is enough for public-read style data.

Option B (more secure, same domain):
- Keep private + use OAuth flow (not for pure no-backend simple version, avoid unless you want auth)

---

### 4. Validate range names in App.jsx

In `rangeForSheet` ensure exact tab names:
- `All-Members!A1:Z200`
- `Maintainance-Status!A1:Z200`
- `spends!A1:Z200`

If your sheet has titles/rows different, adjust to actual range.

---

### 5. Run app

```bash
cd E:\PROJECTS\Sakar-palace-react
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm run dev
```

Open `http://localhost:5173`.

---

## ⚡ Quick debug if error occurs

- `400`/`403`: wrong API key / not enabled API / restrictions mismatch
- `404`/empty: wrong `SHEET_ID` or range name (`gid`/sheet name mismatch)
- `net::ERR_BLOCKED_BY_CLIENT`: browser extension blocking API calls

---

## 🧾 Final check (in App.jsx on top)

```js
const SHEET_ID = '1aBcd...';   // from URL
const API_KEY = 'AIzaSy...';   // from Cloud Console
```

That’s all.