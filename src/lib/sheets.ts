import { google } from 'googleapis';

export interface Initiative {
  id: string;
  name: string;
  pillar: string;
  month: string;
  status: string;
  priority: string;
  owner: string;
  notes: string;
}

// Column order in the Google Sheet
// Row 1 = headers: ID | Name | Pillar | Month | Status | Priority | Owner | Notes
const COLUMNS = ['id', 'name', 'pillar', 'month', 'status', 'priority', 'owner', 'notes'] as const;

function getAuth() {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!credentials) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set');
  }

  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(credentials);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON');
  }

  return new google.auth.GoogleAuth({
    credentials: parsed,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getSheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error('GOOGLE_SHEET_ID environment variable is not set');
  return id;
}

function getSheetName(): string {
  return process.env.GOOGLE_SHEET_NAME || 'Roadmap';
}

async function getSheets() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

export async function getInitiatives(): Promise<Initiative[]> {
  const sheets = await getSheets();
  const spreadsheetId = getSheetId();
  const sheetName = getSheetName();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:H`, // Skip header row
  });

  const rows = res.data.values || [];
  return rows.map((row) => ({
    id: row[0] || '',
    name: row[1] || '',
    pillar: row[2] || '',
    month: row[3] || '',
    status: row[4] || '',
    priority: row[5] || '',
    owner: row[6] || '',
    notes: row[7] || '',
  }));
}

export async function addInitiative(initiative: Omit<Initiative, 'id'>): Promise<Initiative> {
  const sheets = await getSheets();
  const spreadsheetId = getSheetId();
  const sheetName = getSheetName();

  const id = Date.now().toString();
  const row = [id, initiative.name, initiative.pillar, initiative.month, initiative.status, initiative.priority, initiative.owner, initiative.notes];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:H`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });

  return { id, ...initiative };
}

export async function updateInitiative(id: string, updates: Partial<Initiative>): Promise<Initiative | null> {
  const sheets = await getSheets();
  const spreadsheetId = getSheetId();
  const sheetName = getSheetName();

  // Find the row with this ID
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:H`,
  });

  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((row, i) => i > 0 && row[0] === id);
  if (rowIndex === -1) return null;

  const currentRow = rows[rowIndex];
  const current: Initiative = {
    id: currentRow[0] || '',
    name: currentRow[1] || '',
    pillar: currentRow[2] || '',
    month: currentRow[3] || '',
    status: currentRow[4] || '',
    priority: currentRow[5] || '',
    owner: currentRow[6] || '',
    notes: currentRow[7] || '',
  };

  const updated = { ...current, ...updates };
  const newRow = [updated.id, updated.name, updated.pillar, updated.month, updated.status, updated.priority, updated.owner, updated.notes];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowIndex + 1}:H${rowIndex + 1}`,
    valueInputOption: 'RAW',
    requestBody: { values: [newRow] },
  });

  return updated;
}

export async function deleteInitiative(id: string): Promise<boolean> {
  const sheets = await getSheets();
  const spreadsheetId = getSheetId();
  const sheetName = getSheetName();

  // Get all data to find the row
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:H`,
  });

  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((row, i) => i > 0 && row[0] === id);
  if (rowIndex === -1) return false;

  // Get spreadsheet metadata to find the sheet's gid
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets?.find(
    (s) => s.properties?.title === sheetName
  );
  const sheetId = sheet?.properties?.sheetId ?? 0;

  // Delete the row using batchUpdate
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });

  return true;
}

// Ensure the sheet has headers
export async function ensureHeaders(): Promise<void> {
  const sheets = await getSheets();
  const spreadsheetId = getSheetId();
  const sheetName = getSheetName();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:H1`,
  });

  const headers = res.data.values?.[0];
  const expected = ['ID', 'Name', 'Pillar', 'Month', 'Status', 'Priority', 'Owner', 'Notes'];

  if (!headers || headers[0] !== 'ID') {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1:H1`,
      valueInputOption: 'RAW',
      requestBody: { values: [expected] },
    });
  }
}

// ==========================================
// REQUESTS — stored on a separate "Requests" tab
// ==========================================

export interface Request {
  id: string;
  name: string;
  pillar: string;
  month: string;
  priority: string;
  submittedBy: string;
  notes: string;
  submittedAt: string;
}

function getRequestsSheetName(): string {
  return (process.env.GOOGLE_SHEET_NAME || 'Roadmap') + ' Requests';
}

export async function ensureRequestsHeaders(): Promise<void> {
  const sheets = await getSheets();
  const spreadsheetId = getSheetId();
  const sheetName = getRequestsSheetName();

  // First check if the tab exists — if not, create it
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const tabExists = meta.data.sheets?.some(s => s.properties?.title === sheetName);

  if (!tabExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A1:H1`,
  });

  const headers = res.data.values?.[0];
  const expected = ['ID', 'Name', 'Pillar', 'Month', 'Priority', 'Submitted By', 'Notes', 'Submitted At'];

  if (!headers || headers[0] !== 'ID') {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!A1:H1`,
      valueInputOption: 'RAW',
      requestBody: { values: [expected] },
    });
  }
}

export async function getRequests(): Promise<Request[]> {
  const sheets = await getSheets();
  const spreadsheetId = getSheetId();
  const sheetName = getRequestsSheetName();

  // Ensure tab + headers exist
  await ensureRequestsHeaders();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A2:H`,
  });

  const rows = res.data.values || [];
  return rows.map((row) => ({
    id: row[0] || '',
    name: row[1] || '',
    pillar: row[2] || '',
    month: row[3] || '',
    priority: row[4] || '',
    submittedBy: row[5] || '',
    notes: row[6] || '',
    submittedAt: row[7] || '',
  }));
}

export async function addRequest(request: Omit<Request, 'id' | 'submittedAt'>): Promise<Request> {
  const sheets = await getSheets();
  const spreadsheetId = getSheetId();
  const sheetName = getRequestsSheetName();

  await ensureRequestsHeaders();

  const id = Date.now().toString();
  const submittedAt = new Date().toISOString();
  const row = [id, request.name, request.pillar, request.month, request.priority, request.submittedBy, request.notes, submittedAt];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName}'!A:H`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });

  return { id, ...request, submittedAt };
}

export async function deleteRequest(id: string): Promise<boolean> {
  const sheets = await getSheets();
  const spreadsheetId = getSheetId();
  const sheetName = getRequestsSheetName();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A:H`,
  });

  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((row, i) => i > 0 && row[0] === id);
  if (rowIndex === -1) return false;

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets?.find(s => s.properties?.title === sheetName);
  const sheetId = sheet?.properties?.sheetId ?? 0;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 },
        },
      }],
    },
  });

  return true;
}

// Approve a request: delete from Requests tab, add to Roadmap tab
export async function approveRequest(id: string): Promise<Initiative | null> {
  const sheets = await getSheets();
  const spreadsheetId = getSheetId();
  const sheetName = getRequestsSheetName();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A:H`,
  });

  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((row, i) => i > 0 && row[0] === id);
  if (rowIndex === -1) return null;

  const row = rows[rowIndex];
  const request: Request = {
    id: row[0] || '',
    name: row[1] || '',
    pillar: row[2] || '',
    month: row[3] || '',
    priority: row[4] || '',
    submittedBy: row[5] || '',
    notes: row[6] || '',
    submittedAt: row[7] || '',
  };

  // Add to the main roadmap
  const initiative = await addInitiative({
    name: request.name,
    pillar: request.pillar,
    month: request.month,
    status: 'Planned',
    priority: request.priority,
    owner: '',
    notes: request.notes,
  });

  // Delete from requests
  await deleteRequest(id);

  return initiative;
}

// Verify approver password
export function verifyApproverPassword(password: string): boolean {
  const stored = process.env.APPROVER_PASSWORD;
  if (!stored) return false;
  return password === stored;
}

// Test connection — used by the config page
export async function testConnection(): Promise<{ success: boolean; message: string; sheetTitle?: string }> {
  try {
    const sheets = await getSheets();
    const spreadsheetId = getSheetId();

    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const title = meta.data.properties?.title || 'Unknown';

    // Ensure headers exist on both tabs
    await ensureHeaders();
    await ensureRequestsHeaders();

    return { success: true, message: `Connected to "${title}"`, sheetTitle: title };
  } catch (err: any) {
    return { success: false, message: err.message || 'Unknown error' };
  }
}
