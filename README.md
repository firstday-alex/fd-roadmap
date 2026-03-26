# firstday.com — Q2 2026 Roadmap

A roadmap board for tracking ecommerce initiatives across CVR, AOV, and LTV pillars. Backed by Google Sheets so anyone can manage items from the sheet or the web UI.

## Quick Start

1. **Clone & install**
   ```bash
   npm install
   ```

2. **Set up Google Sheets** (see in-app config page at `/config` for full guide)
   - Create a Google Cloud service account with Sheets API enabled
   - Create a Google Sheet, share it with the service account email as Editor
   - Copy `.env.local.example` to `.env.local` and fill in your values

3. **Run locally**
   ```bash
   npm run dev
   ```

4. **Open** http://localhost:3000

## Deploy to Vercel

1. Push this repo to GitHub
2. Import it in [Vercel](https://vercel.com/new)
3. Add environment variables in Vercel project settings:
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SHEET_NAME` (optional, defaults to "Roadmap")
   - `GOOGLE_SERVICE_ACCOUNT_KEY` (paste the full JSON key)
4. Deploy

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_SHEET_ID` | Yes | The ID from your Google Sheet URL |
| `GOOGLE_SHEET_NAME` | No | Tab name, defaults to "Roadmap" |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Yes | Full JSON service account key |

## Sheet Schema

The app expects (and auto-creates) these headers in row 1:

| Column | Header | Values |
|---|---|---|
| A | ID | Auto-generated |
| B | Name | Initiative name |
| C | Pillar | CVR / AOV / LTV |
| D | Month | April / May / June |
| E | Status | Planned / In Progress / Done |
| F | Priority | High / Medium / Low |
| G | Owner | Free text |
| H | Notes | Free text |
# fd-roadmap
