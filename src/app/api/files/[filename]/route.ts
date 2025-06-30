import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'resources');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    // Security: Only allow files that match our naming convention
    if (!filename.startsWith('supporting-doc-')) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const filepath = path.join(UPLOAD_DIR, filename);
    
    try {
      const fileBuffer = await fs.readFile(filepath);
      
      // Determine content type based on file extension
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream';
      
      switch (ext) {
        case '.pdf':
          contentType = 'application/pdf';
          break;
        case '.doc':
          contentType = 'application/msword';
          break;
        case '.docx':
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
      }

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'private, max-age=0, no-cache',
        },
      });
    } catch {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}