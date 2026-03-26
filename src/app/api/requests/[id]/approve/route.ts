import { NextRequest, NextResponse } from 'next/server';
import { approveRequest, deleteRequest, verifyApproverPassword } from '@/lib/sheets';

// POST — approve a request (moves it to the roadmap)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { password } = body;

    if (!verifyApproverPassword(password)) {
      return NextResponse.json({ error: 'Invalid approver password' }, { status: 401 });
    }

    const initiative = await approveRequest(params.id);
    if (!initiative) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, initiative });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — reject a request (removes it)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { password } = body;

    if (!verifyApproverPassword(password)) {
      return NextResponse.json({ error: 'Invalid approver password' }, { status: 401 });
    }

    const deleted = await deleteRequest(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
