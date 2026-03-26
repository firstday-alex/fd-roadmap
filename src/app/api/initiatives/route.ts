import { NextRequest, NextResponse } from 'next/server';
import { getInitiatives, addInitiative } from '@/lib/sheets';

export async function GET() {
  try {
    const items = await getInitiatives();
    return NextResponse.json(items);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, pillar, month, status, priority, owner, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const item = await addInitiative({
      name: name.trim(),
      pillar: pillar || 'CVR',
      month: month || 'April',
      status: status || 'Planned',
      priority: priority || 'High',
      owner: owner || '',
      notes: notes || '',
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
