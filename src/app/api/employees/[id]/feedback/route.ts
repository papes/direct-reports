import { NextRequest, NextResponse } from 'next/server';
import { EmployeeDB } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { content } = await request.json();
    
    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const feedback = await EmployeeDB.addFeedback(params.id, content);
    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    console.error('Error adding feedback:', error);
    
    if (error instanceof Error && error.message === 'Employee not found') {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add feedback' },
      { status: 500 }
    );
  }
}