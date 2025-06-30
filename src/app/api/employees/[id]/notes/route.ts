import { NextRequest, NextResponse } from 'next/server';
import { EmployeeDB } from '@/lib/database';
import { FileUploadService } from '@/lib/fileUpload';
import { SupportingDocument } from '@/types/employee';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    
    const content = formData.get('content') as string;
    const date = formData.get('date') as string;
    
    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Get employee info for file naming
    const employee = await EmployeeDB.getEmployee(id);
    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    const supportingDocuments: SupportingDocument[] = [];
    
    // Process uploaded files
    const files = formData.getAll('files') as File[];
    for (const file of files) {
      if (file.size > 0) {
        try {
          const document = await FileUploadService.uploadFile(
            file,
            employee.name,
            date || new Date().toISOString()
          );
          supportingDocuments.push(document);
        } catch (fileError) {
          console.error('Error uploading file:', fileError);
          // Continue with other files, just log the error
        }
      }
    }

    const note = await EmployeeDB.addNote(id, content, date, supportingDocuments);
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Error adding note:', error);
    
    if (error instanceof Error && error.message === 'Employee not found') {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add note' },
      { status: 500 }
    );
  }
}