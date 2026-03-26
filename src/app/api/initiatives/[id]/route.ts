import { NextRequest, NextResponse } from 'next/server';
import { updateInitiative, deleteInitiative } from '@/lib/sheets';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updated = await updateInitiative(params.id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const deleted = await deleteInitiative(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
