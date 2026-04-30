import { NextResponse } from 'next/server';
import { addAccomplishment, getAccomplishments } from '@/lib/sheets';

const CSV_FALLBACK_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTAEDGH1uzb5zZmfhttfo6nCF7EIF-29VT_i9m6pUVbigLrXiY8-hjd0-eldf9fIl2VsBp_GpeV5J8U/pub?output=csv';

export const dynamic = 'force-dynamic';

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { inQuotes = false; }
      } else { cell += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\r') { /* ignore */ }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else { cell += c; }
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

async function getViaCSV() {
  const res = await fetch(CSV_FALLBACK_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
  const text = await res.text();
  const rows = parseCSV(text).filter(r => r.some(c => c.trim() !== ''));
  if (rows.length < 1) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map((r, idx) => {
    const obj: Record<string, string> = { id: String(idx) };
    headers.forEach((h, i) => { obj[h] = (r[i] || '').trim(); });
    return obj;
  });
}

export async function GET() {
  try {
    const items = await getAccomplishments();
    return NextResponse.json(items);
  } catch (err: any) {
    // Fall back to published CSV if the service account doesn't have read access
    try {
      const items = await getViaCSV();
      return NextResponse.json(items);
    } catch {
      return NextResponse.json({ error: err.message || 'Failed to load accomplishments' }, { status: 500 });
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const required = ['Feature'];
    for (const k of required) {
      if (!body[k] || !String(body[k]).trim()) {
        return NextResponse.json({ error: `Missing field: ${k}` }, { status: 400 });
      }
    }
    const item = {
      Feature: String(body.Feature || '').trim(),
      Theme: String(body.Theme || '').trim(),
      OKR: String(body.OKR || '').trim(),
      'Impact Size': String(body['Impact Size'] || '').trim(),
      'Impact Notes': String(body['Impact Notes'] || '').trim(),
      'Completed Date': String(body['Completed Date'] || '').trim(),
    };
    await addAccomplishment(item);
    return NextResponse.json({ ...item, id: `new-${Date.now()}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add accomplishment' }, { status: 500 });
  }
}
