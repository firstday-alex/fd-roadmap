import { NextRequest, NextResponse } from 'next/server';
import { getRequests, addRequest, verifyApproverPassword } from '@/lib/sheets';

// GET — list all pending requests (requires approver password)
export async function GET(req: NextRequest) {
  try {
    const password = req.headers.get('x-approver-password') || '';
    if (!verifyApproverPassword(password)) {
      return NextResponse.json({ error: 'Invalid approver password' }, { status: 401 });
    }
    const items = await getRequests();
    return NextResponse.json(items);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — submit a new request (public, no password needed)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, pillar, month, priority, submittedBy, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!submittedBy?.trim()) {
      return NextResponse.json({ error: 'Your name is required' }, { status: 400 });
    }

    const item = await addRequest({
      name: name.trim(),
      pillar: pillar || 'CVR',
      month: month || 'April',
      priority: priority || 'Medium',
      submittedBy: submittedBy.trim(),
      notes: notes || '',
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
