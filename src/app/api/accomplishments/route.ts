import { NextResponse } from 'next/server';
import { addAccomplishment, getAccomplishments } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await getAccomplishments();
    return NextResponse.json(items);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load accomplishments' }, { status: 500 });
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
