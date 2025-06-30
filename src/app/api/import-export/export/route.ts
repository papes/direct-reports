import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import AdmZip from 'adm-zip';
import { EmployeeDB } from '@/lib/database';
import { EmployeeDatabase, SupportingDocument } from '@/types/employee';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // 'json' or 'zip'
    
    // Validate format parameter early
    if (format !== 'json' && format !== 'zip') {
      return NextResponse.json(
        { error: 'Invalid format parameter. Use "json" or "zip"' },
        { status: 400 }
      );
    }
    
    const jsonData = await EmployeeDB.exportToJSON();
    const parsedData: EmployeeDatabase = JSON.parse(jsonData);
    
    if (format === 'json') {
      // Legacy JSON export
      return new NextResponse(jsonData, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="employee-data-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }
    
    if (format === 'zip') {
      // Enhanced ZIP export with documents
      const zip = new AdmZip();
      const resourcesPath = path.join(process.cwd(), 'data', 'resources');
      
      // Collect all referenced documents and add checksums
      const documentMap = new Map<string, SupportingDocument>();
      const enhancedData = { ...parsedData };
      
      for (const employee of enhancedData.employees) {
        // Process notes with supporting documents
        for (const note of employee.notes) {
          if (note.supportingDocuments && note.supportingDocuments.length > 0) {
            const validDocs: SupportingDocument[] = [];
            
            for (const doc of note.supportingDocuments) {
              const filePath = path.join(resourcesPath, doc.filename);
              
              try {
                const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
                if (!fileExists) {
                  console.warn(`Document not found: ${doc.filename}`);
                  continue;
                }
                
                // Add checksum for validation
                const fileBuffer = await fs.readFile(filePath);
                const checksum = createHash('sha256').update(fileBuffer).digest('hex');
                
                const enhancedDoc: SupportingDocument = {
                  ...doc,
                  checksum
                };
                
                validDocs.push(enhancedDoc);
                documentMap.set(doc.filename, enhancedDoc);
              } catch (error) {
                console.warn(`Error processing document ${doc.filename}:`, error);
              }
            }
            
            note.supportingDocuments = validDocs;
          }
        }
        
        // Process performance reviews
        if (employee.performanceReviews && employee.performanceReviews.length > 0) {
          const validReviews: SupportingDocument[] = [];
          
          for (const doc of employee.performanceReviews) {
            const filePath = path.join(resourcesPath, doc.filename);
            
            try {
              const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
              if (!fileExists) {
                console.warn(`Performance review document not found: ${doc.filename}`);
                continue;
              }
              
              // Add checksum for validation
              const fileBuffer = await fs.readFile(filePath);
              const checksum = createHash('sha256').update(fileBuffer).digest('hex');
              
              const enhancedDoc: SupportingDocument = {
                ...doc,
                checksum
              };
              
              validReviews.push(enhancedDoc);
              documentMap.set(doc.filename, enhancedDoc);
            } catch (error) {
              console.warn(`Error processing performance review document ${doc.filename}:`, error);
            }
          }
          
          employee.performanceReviews = validReviews;
        }
      }
      
      // Add JSON data to ZIP
      zip.addFile('employee-data.json', Buffer.from(JSON.stringify(enhancedData, null, 2)));
      
      // Add documents to ZIP
      for (const [filename] of documentMap) {
        const filePath = path.join(resourcesPath, filename);
        try {
          const fileBuffer = await fs.readFile(filePath);
          zip.addFile(`documents/${filename}`, fileBuffer);
        } catch (error) {
          console.warn(`Failed to add document to ZIP: ${filename}`, error);
        }
      }
      
      // Add manifest file with export metadata
      const manifest = {
        exportDate: new Date().toISOString(),
        version: '2.0',
        documentCount: documentMap.size,
        employeeCount: enhancedData.employees.length,
        format: 'employee-notes-archive'
      };
      zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2)));
      
      const zipBuffer = zip.toBuffer();
      
      return new NextResponse(zipBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="employee-data-${new Date().toISOString().split('T')[0]}.zip"`,
        },
      });
    }
    
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}