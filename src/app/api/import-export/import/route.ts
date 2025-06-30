import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import AdmZip from 'adm-zip';
import { EmployeeDB } from '@/lib/database';
import { EmployeeDatabase } from '@/types/employee';

interface ImportResult {
  success: boolean;
  message?: string;
  error?: string;
  missingDocsCount?: number;
  importedDocsCount?: number;
  checksumErrors?: number;
}

export async function POST(request: NextRequest): Promise<NextResponse<ImportResult>> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    let importData: EmployeeDatabase;
    let importedDocsCount = 0;
    let checksumErrors = 0;

    // Handle ZIP files
    if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
      try {
        const zip = new AdmZip(fileBuffer);
        const zipEntries = zip.getEntries();
        
        // Find and validate manifest
        const manifestEntry = zipEntries.find(entry => entry.entryName === 'manifest.json');
        if (manifestEntry) {
          const manifestContent = manifestEntry.getData().toString('utf8');
          const manifest = JSON.parse(manifestContent);
          
          // Validate archive format
          if (manifest.format !== 'employee-notes-archive') {
            return NextResponse.json(
              { success: false, error: 'Invalid archive format' },
              { status: 400 }
            );
          }
        }
        
        // Extract employee data
        const dataEntry = zipEntries.find(entry => entry.entryName === 'employee-data.json');
        if (!dataEntry) {
          return NextResponse.json(
            { success: false, error: 'Archive missing employee-data.json' },
            { status: 400 }
          );
        }
        
        const jsonContent = dataEntry.getData().toString('utf8');
        importData = JSON.parse(jsonContent);
        
        // Extract and validate documents
        const resourcesPath = path.join(process.cwd(), 'data', 'resources');
        await fs.mkdir(resourcesPath, { recursive: true });
        
        const documentEntries = zipEntries.filter(entry => 
          entry.entryName.startsWith('documents/') && !entry.isDirectory
        );
        
        for (const docEntry of documentEntries) {
          const filename = path.basename(docEntry.entryName);
          const filePath = path.join(resourcesPath, filename);
          const fileData = docEntry.getData();
          
          // Find corresponding document metadata for checksum validation
          let expectedChecksum: string | undefined;
          for (const employee of importData.employees) {
            // Check notes supporting documents
            for (const note of employee.notes) {
              if (note.supportingDocuments) {
                const doc = note.supportingDocuments.find(d => d.filename === filename);
                if (doc?.checksum) {
                  expectedChecksum = doc.checksum;
                  break;
                }
              }
            }
            if (expectedChecksum) break;
            
            // Check performance reviews
            if (employee.performanceReviews) {
              const doc = employee.performanceReviews.find(d => d.filename === filename);
              if (doc?.checksum) {
                expectedChecksum = doc.checksum;
                break;
              }
            }
          }
          
          // Validate checksum if available
          if (expectedChecksum) {
            const actualChecksum = createHash('sha256').update(fileData).digest('hex');
            if (actualChecksum !== expectedChecksum) {
              console.warn(`Checksum mismatch for ${filename}: expected ${expectedChecksum}, got ${actualChecksum}`);
              checksumErrors++;
              continue; // Skip corrupted files
            }
          }
          
          // Write file to resources directory
          await fs.writeFile(filePath, fileData);
          importedDocsCount++;
        }
        
      } catch (error) {
        console.error('ZIP processing error:', error);
        return NextResponse.json(
          { success: false, error: 'Invalid ZIP archive or processing error' },
          { status: 400 }
        );
      }
    }
    // Handle legacy JSON files
    else if (file.type === 'application/json' || file.name.endsWith('.json')) {
      const fileContent = await file.text();
      try {
        importData = JSON.parse(fileContent);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid JSON format' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'File must be a JSON or ZIP file' },
        { status: 400 }
      );
    }

    // Validate the data structure
    if (!importData.employees || !Array.isArray(importData.employees)) {
      return NextResponse.json(
        { success: false, error: 'Invalid data structure: missing employees array' },
        { status: 400 }
      );
    }

    // Validate each employee structure
    for (const employee of importData.employees) {
      if (!employee.id || !employee.name || !employee.startDate) {
        return NextResponse.json(
          { success: false, error: 'Invalid employee structure: missing required fields (id, name, startDate)' },
          { status: 400 }
        );
      }

      if (!Array.isArray(employee.notes) || !Array.isArray(employee.praise) || !Array.isArray(employee.feedback)) {
        return NextResponse.json(
          { success: false, error: 'Invalid employee structure: notes, praise, and feedback must be arrays' },
          { status: 400 }
        );
      }
      
      // Ensure performanceReviews array exists (for backward compatibility)
      if (!employee.performanceReviews) {
        employee.performanceReviews = [];
      } else if (!Array.isArray(employee.performanceReviews)) {
        return NextResponse.json(
          { success: false, error: 'Invalid employee structure: performanceReviews must be an array' },
          { status: 400 }
        );
      }
    }

    // For legacy JSON imports, check for missing supporting documents and clean them up
    const resourcesPath = path.join(process.cwd(), 'data', 'resources');
    let missingDocsCount = 0;

    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      for (const employee of importData.employees) {
        for (const note of employee.notes) {
          if (note.supportingDocuments && note.supportingDocuments.length > 0) {
            const validDocs = [];
            
            for (const doc of note.supportingDocuments) {
              const filePath = path.join(resourcesPath, doc.filename);
              try {
                await fs.access(filePath);
                validDocs.push(doc);
              } catch {
                missingDocsCount++;
              }
            }
            
            note.supportingDocuments = validDocs;
          }
        }
      }
    }

    // Import the cleaned data
    await EmployeeDB.importFromJSON(JSON.stringify(importData));

    // Build response message
    let message = 'Data imported successfully';
    const details = [];
    
    if (importedDocsCount > 0) {
      details.push(`${importedDocsCount} document(s) imported`);
    }
    
    if (missingDocsCount > 0) {
      details.push(`${missingDocsCount} document(s) were skipped due to missing files`);
    }
    
    if (checksumErrors > 0) {
      details.push(`${checksumErrors} document(s) failed checksum validation`);
    }
    
    if (details.length > 0) {
      message += `. ${details.join(', ')}.`;
    }

    return NextResponse.json({ 
      success: true, 
      message,
      missingDocsCount,
      importedDocsCount,
      checksumErrors
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import data' },
      { status: 500 }
    );
  }
}