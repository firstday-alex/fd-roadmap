import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/sheets';

export async function GET() {
  try {
    const result = await testConnection();
    return NextResponse.json({
      ...result,
      sheetId: process.env.GOOGLE_SHEET_ID ? '••••' + process.env.GOOGLE_SHEET_ID.slice(-8) : null,
      sheetName: process.env.GOOGLE_SHEET_NAME || 'Roadmap',
      hasServiceKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      hasApproverPassword: !!process.env.APPROVER_PASSWORD,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err.message,
      sheetId: process.env.GOOGLE_SHEET_ID ? '••••' + process.env.GOOGLE_SHEET_ID.slice(-8) : null,
      sheetName: process.env.GOOGLE_SHEET_NAME || 'Roadmap',
      hasServiceKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      hasApproverPassword: !!process.env.APPROVER_PASSWORD,
    });
  }
}
