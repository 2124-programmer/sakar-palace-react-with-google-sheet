# Sakar Palace Society Portal

A modern, responsive web portal for **Sakar Palace B** housing society. Built with React + Vite, it reads live data directly from Google Sheets — no backend server required. Society administrators update a spreadsheet, and the portal reflects changes automatically.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Pages](#pages)
- [Google Sheets Integration](#google-sheets-integration)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Build & Deployment](#build--deployment)
- [Data Model](#data-model)
- [Fallback Behavior](#fallback-behavior)

---

## Features

- **Live Google Sheets sync** — data is fetched from your society's spreadsheet on every page load
- **Members directory** — searchable list of all flat owners/tenants with occupancy filter
- **Maintenance tracker** — month-wise payment status for every flat with summary KPIs (collected, required, pending, advanced)
- **Expenses log** — society expense records with category-level breakdown
- **Dashboard** — society stats, announcements, upcoming events, emergency contacts, and complaints
- **Notice board** — publish notices visible to all members
- **No backend required** — runs entirely in the browser; Google Sheets acts as the database
- **Public URL fallback** — works even without a Google API key using the public GViz endpoint
- **Fully responsive** — works on desktop, tablet, and mobile

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 |
| Build Tool | Vite 8 |
| Routing | React Router v6 |
| Data Source | Google Sheets API v4 / GViz public endpoint |
| Styling | Plain CSS (custom, no framework) |
| State Management | React hooks (`useState`, `useMemo`, `useEffect`) |

---

## Project Structure

```
sakar-palace-react/
├── index.html                  # App entry HTML
├── vite.config.js              # Vite configuration
├── .env                        # Environment variables (NOT committed)
├── .env.example                # Template for environment variables
├── src/
│   ├── main.jsx                # React app bootstrap
│   ├── App.jsx                 # Root component
│   ├── styles.css              # Global + page-specific styles
│   ├── app/
│   │   └── AppRouter.jsx       # All route definitions
│   ├── pages/
│   │   ├── DashboardPage.jsx   # Society overview & stats
│   │   ├── MembersPage.jsx     # Flat member directory
│   │   ├── MaintenancePage.jsx # Monthly maintenance payments
│   │   ├── ExpensesPage.jsx    # Society expense records
│   │   └── NoticeBoardPage.jsx # Society notices
│   ├── layouts/
│   │   └── MainLayout.jsx      # Shared sidebar/header shell
│   ├── hooks/
│   │   ├── useMembers.js       # Fetch + state for members data
│   │   ├── useMaintenance.js   # Fetch + state for maintenance data
│   │   ├── useExpenses.js      # Fetch + state for expenses data
│   │   └── useDashboardData.js # Fetch + state for dashboard data
│   ├── services/
│   │   ├── sheetDataService.js # Members, Maintenance, Expenses fetch & parse
│   │   └── googleSheets.js     # Dashboard-specific data fetch & parse
│   ├── data/
│   │   └── societyData.js      # Static fallback data & society metadata
│   ├── components/
│   │   └── common/             # Shared UI components
│   └── utils/                  # Utility/helper functions
```

---

## Pages

### Dashboard (`/`)
- Society name, total flats
- Announcements, upcoming events
- Emergency contacts
- Complaints log
- Maintenance summary overview

### Members (`/members`)
- Full flat-wise resident directory
- Search by name, flat number, or wing
- Filter by occupancy type (Owner / Tenant / Vacant)
- Shows: Flat No, Wing, Resident Name, Type, Contact, Family Members

### Maintenance (`/maintenance`)
- Monthly payment tracking for all flats (Jan–Dec)
- **Month filter** — view a single month or all months at once
- **Search** by flat number or resident name
- **Summary cards**: Total Flats, Amount Collected, Amount Required, Pending/Advanced
- **Monthly overview table**: Total Received / Required / Pending / Advanced Jama per month
- **Per-flat table**: Flat No, Resident, Selected Month Amount, Advanced Jama, Annual Total

### Expenses (`/expenses`)
- Society expense records fetched from the `Expenses Details` sheet
- Categorized expense view

### Notice Board (`/notice-board`)
- Society notices and circulars

---

## Google Sheets Integration

The app reads from three sheets inside a single Google Spreadsheet:

| Sheet Name | Used By | Description |
|-----------|---------|-------------|
| `Members` | Members page | Flat-wise resident details |
| `MaintenancePaid` | Maintenance page | Monthly payment amounts per flat |
| `Expenses Details` | Expenses page | Itemized society expenses |

### How It Works

1. On page load, each custom hook (`useMembers`, `useMaintenance`, etc.) calls the corresponding service function.
2. If `VITE_GOOGLE_SHEETS_API_KEY` is set, the app uses the **Google Sheets API v4** (authenticated, higher quota).
3. If only `VITE_GOOGLE_SHEET_ID` is set (no API key), the app falls back to the **public GViz endpoint** (`/gviz/tq?sheet=...`) — no credentials needed, but the spreadsheet must be shared publicly.
4. Header rows are auto-detected — the parser scans up to the first 12 rows to locate the header by matching known column name aliases.

### Expected Sheet Columns

**Members sheet** — order-flexible, matched by column name:
- Wing / Tower
- Flat No
- Owner / Tenant (or Resident / Name)
- Occupancy Type
- Contact / Phone / Mobile
- Family Members

**MaintenancePaid sheet** — order-flexible, matched by column name:
- Flat No
- Resident
- Monthly columns named `Jan-26`, `Feb-26`, … `Dec-26`
- Advanced Jama
- Summary rows: `Total Received`, `Required`, `Pendings`, `Advanced Jama`

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values.

```env
# Required — your Google Spreadsheet ID
# Found in the sheet URL: https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit
VITE_GOOGLE_SHEET_ID=your_spreadsheet_id_here

# Optional — enables authenticated API access (higher quota, private sheets)
# Create at: https://console.cloud.google.com/ → APIs & Services → Credentials
VITE_GOOGLE_SHEETS_API_KEY=your_api_key_here
```

> **Without an API key**: The spreadsheet must be shared as "Anyone with the link can view". The app will use the public GViz endpoint automatically.

> **With an API key**: The spreadsheet can be private. Google Sheets API v4 must be enabled in your Google Cloud project.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A Google Spreadsheet with the data (see [Google Sheets Integration](#google-sheets-integration))

### Installation

```powershell
# Clone the repository
git clone https://github.com/2124-programmer/sakar-palace-react-with-google-sheet.git
cd sakar-palace-react-with-google-sheet

# Install dependencies
npm install

# Set up environment variables
copy .env.example .env
# Edit .env and add your VITE_GOOGLE_SHEET_ID (and optionally API key)
```

### Run Development Server

```powershell
npm.cmd run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> **Note (Windows):** Use `npm.cmd run dev` if `npm run dev` gives a PowerShell script execution policy error.

---

## Build & Deployment

```powershell
# Build for production
npm.cmd run build

# Preview the production build locally
npm.cmd run preview
```

The `dist/` folder contains the static output. Deploy it to any static hosting service:

- **GitHub Pages** — push `dist/` to `gh-pages` branch
- **Netlify / Vercel** — connect the repo and set build command to `npm run build`, output dir to `dist`
- **Any web server** — copy `dist/` contents to the server's public folder

> Remember to set your environment variables in the hosting platform's settings (not in the repo — the `.env` file is gitignored).

---

## Data Model

### Maintenance Data Shape (from `useMaintenance`)

```js
{
  records: [
    {
      flatNo: "A-101",
      resident: "John Doe",
      months: { "jan-26": 1500, "feb-26": 1500, ... },
      advancedJama: 0,
      annualTotal: 18000
    }
  ],
  months: ["jan-26", "feb-26", ...],   // all month columns found in sheet
  summaries: {
    totalReceived:    { "jan-26": 15000, "feb-26": 12000, ... },
    required:         { "jan-26": 16000, ... },
    pendings:         { "jan-26": 1000, ... },
    advancedJamaByMonth: { "jan-26": 0, ... }
  },
  totals: {
    advancedJamaMembers: 2
  }
}
```

---

## Fallback Behavior

If Google Sheets cannot be reached (network error, wrong Sheet ID, permissions), the app:
1. Logs the error to the browser console
2. Falls back to the static data in `src/data/societyData.js`
3. Shows a yellow warning banner on the affected page ("Using offline/fallback data")

The rest of the UI remains fully functional with the fallback data.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

This project is private and intended for **Sakar Palace B** society management use only.
