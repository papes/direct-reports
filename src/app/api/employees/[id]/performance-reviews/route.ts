import { NextRequest, NextResponse } from 'next/server';
import { EmployeeDB } from '@/lib/database';
import { SupportingDocument } from '@/types/employee';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { document }: { document: SupportingDocument } = await request.json();

    if (!document) {
      return NextResponse.json(
        { error: 'Performance review document is required' },
        { status: 400 }
      );
    }

    // Validate document has required fields
    if (!document.id || !document.filename || !document.originalName || 
        !document.path || !document.mimeType || !document.size) {
      return NextResponse.json(
        { error: 'Document must have id, filename, originalName, path, mimeType, and size' },
        { status: 400 }
      );
    }

    const result = await EmployeeDB.addPerformanceReview(id, document);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Employee not found') {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    console.error('Error adding performance review:', error);
    return NextResponse.json(
      { error: 'Failed to add performance review' },
      { status: 500 }
    );
  }
}