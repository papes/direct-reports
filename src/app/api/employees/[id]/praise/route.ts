import { NextRequest, NextResponse } from 'next/server';
import { EmployeeDB } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { content, date } = await request.json();
    const { id } = await params;
    
    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const praise = await EmployeeDB.addPraise(id, content, date);
    return NextResponse.json(praise, { status: 201 });
  } catch (error) {
    console.error('Error adding praise:', error);
    
    if (error instanceof Error && error.message === 'Employee not found') {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add praise' },
      { status: 500 }
    );
  }
}