# Sakar Palace Society Portal

A responsive housing society web portal built with React and Vite.
The app reads operational data from Google Sheets and uses frontend-only login for member access.

## Features

- Login with mobile number + 6-digit code
- Role-based access: admin and viewer
- Admin-only Maintenance Admin View
- Individual Maintenance View for all users
- Dashboard cards and tables from dedicated dashboard sheets
- Members directory with search and occupancy filters
- Expenses ledger with month/category filters, status tracking, and admin CRUD UI
- Notice board view
- Fallback sample data for pages that support fallback mode

## Tech Stack

- React 18
- Vite 8
- React Router v6
- Google Sheets API v4
- Plain CSS

## Routes

- /login -> Login screen
- / -> Dashboard
- /members -> Members list
- /maintenance -> Maintenance tracking
- /expenses -> Expenses ledger
- /notice-board -> Notices

All app routes except /login are protected by login session.

## Role Behavior

- Admin:
  - Can switch Maintenance page to Admin View
  - Can perform Add, Edit, Delete, and status changes in Expenses page
- Viewer:
  - Can access only Individual View in Maintenance page
  - Can view expenses data but cannot perform admin actions

## Project Structure

```text
sakar-palace-react/
|-- src/
|   |-- app/
|   |   |-- AppRouter.jsx
|   |-- hooks/
|   |   |-- useAuth.js
|   |   |-- useAppRole.js
|   |   |-- useDashboardData.js
|   |   |-- useExpenses.js
|   |   |-- useMaintenance.js
|   |   |-- useMembers.js
|   |-- layouts/
|   |   |-- MainLayout.jsx
|   |-- pages/
|   |   |-- LoginPage.jsx
|   |   |-- DashboardPage.jsx
|   |   |-- MembersPage.jsx
|   |   |-- MaintenancePage.jsx
|   |   |-- ExpensesPage.jsx
|   |   |-- NoticeBoardPage.jsx
|   |-- services/
|   |   |-- googleSheets.js
|   |   |-- sheetDataService.js
|   |-- data/
|   |   |-- societyData.js
|   |-- components/
|   |   |-- common/
|   |-- styles.css
|   |-- main.jsx
|-- .env.example
|-- vite.config.js
```

## Google Sheets Setup

Use one spreadsheet with these tabs:

- Members
- MaintenancePaid
- Expenses Details
- Dashboard-Stats
- latest-announcements
- emergency-contacts
- Complaints

### Members columns (for directory + login)

Required or supported aliases:

- Wing or Tower
- Flat No
- Owner / Tenant or Resident or Name
- Occupancy Type
- Contact or Phone or Mobile
- Role or Access Role (set admin for admins)
- Code or Pin or Login Code or Passcode (6-digit login code)
- Family Members

### MaintenancePaid columns

- Flat No
- Resident
- Month columns like Jan-26 to Dec-26
- Advanced Jama

Optional summary rows recognized by label:

- Total Received
- Required
- Pendings
- Advanced Jama
- Amount/Head

### Expenses Details supported formats

1. Ledger format (recommended):
   - Sr No, Month, Expense Name, Category, Amount, Pay To, Status, Paid Date
2. Wide monthly format:
   - Sr No, Expense Title, Jan-26..Dec-26, Total

## Environment Variables

Create a .env file:

```env
VITE_GOOGLE_SHEET_ID=your_spreadsheet_id
VITE_GOOGLE_SHEETS_API_KEY=your_google_api_key
```

Notes:

- Sheet ID is required across the app.
- Dashboard and Expenses pages require API key based fetch in current implementation.
- Members and Maintenance can fall back to public GViz when API key is missing, if sheet sharing allows it.

## Run Locally

```powershell
npm install
npm.cmd run dev
```

Open http://localhost:5173

If PowerShell blocks npm scripts, use npm.cmd commands.

## Production Build

```powershell
npm.cmd run build
npm.cmd run preview
```

## Important Notes

- Authentication is frontend-only and session data is stored in browser localStorage.
- Expenses admin operations are currently local (browser-persisted) and are not written back to Google Sheets.
- Treat this project as an internal portal and avoid exposing sensitive credentials.

## License

Private project for Sakar Palace society operations.
