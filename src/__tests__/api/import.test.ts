import { POST } from '@/app/api/import-export/import/route';
import { EmployeeDB } from '@/lib/database';
import { promises as fs } from 'fs';
import AdmZip from 'adm-zip';
import { createHash } from 'crypto';

jest.mock('@/lib/database');
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
  },
}));

const mockEmployeeDB = EmployeeDB as jest.Mocked<typeof EmployeeDB>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('/api/import-export/import', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST - JSON Import (Legacy)', () => {
    it('should import JSON data successfully', async () => {
      const validJsonData = {
        employees: [
          {
            id: '1',
            name: 'John Doe',
            startDate: '2023-01-01',
            notes: [],
            praise: [],
            feedback: [],
            performanceReviews: []
          }
        ],
        lastUpdated: '2023-01-01T00:00:00.000Z'
      };

      const formData = new FormData();
      const jsonBlob = new Blob([JSON.stringify(validJsonData)], { type: 'application/json' });
      formData.append('file', jsonBlob, 'test-data.json');

      mockEmployeeDB.importFromJSON.mockResolvedValue(undefined);

      const mockRequest = new Request('http://localhost/api/import-export/import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toMatchObject({
        success: true,
        message: 'Data imported successfully'
      });
      expect(mockEmployeeDB.importFromJSON).toHaveBeenCalledWith(JSON.stringify(validJsonData));
    });

    it('should handle missing supporting documents in JSON import', async () => {
      const jsonDataWithDocs = {
        employees: [
          {
            id: '1',
            name: 'John Doe',
            startDate: '2023-01-01',
            notes: [
              {
                id: 'note1',
                date: '2023-01-01',
                content: 'Test note',
                supportingDocuments: [
                  {
                    id: 'doc1',
                    filename: 'missing-doc.pdf',
                    originalName: 'missing.pdf',
                    path: '/api/files/missing-doc.pdf',
                    mimeType: 'application/pdf',
                    size: 1024
                  },
                  {
                    id: 'doc2',
                    filename: 'existing-doc.pdf',
                    originalName: 'existing.pdf',
                    path: '/api/files/existing-doc.pdf',
                    mimeType: 'application/pdf',
                    size: 2048
                  }
                ]
              }
            ],
            praise: [],
            feedback: [],
            performanceReviews: []
          }
        ],
        lastUpdated: '2023-01-01T00:00:00.000Z'
      };

      const formData = new FormData();
      const jsonBlob = new Blob([JSON.stringify(jsonDataWithDocs)], { type: 'application/json' });
      formData.append('file', jsonBlob, 'test-data.json');

      // Mock first file missing, second file exists
      mockFs.access
        .mockRejectedValueOnce(new Error('File not found'))
        .mockResolvedValueOnce(undefined);
      
      mockEmployeeDB.importFromJSON.mockResolvedValue(undefined);

      const mockRequest = new Request('http://localhost/api/import-export/import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toMatchObject({
        success: true,
        message: 'Data imported successfully. 1 document(s) were skipped due to missing files.',
        missingDocsCount: 1
      });
    });

    it('should reject invalid JSON format', async () => {
      const formData = new FormData();
      const invalidJsonBlob = new Blob(['invalid json'], { type: 'application/json' });
      formData.append('file', invalidJsonBlob, 'invalid.json');

      const mockRequest = new Request('http://localhost/api/import-export/import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toMatchObject({
        success: false,
        error: 'Invalid JSON format'
      });
    });

    it('should reject invalid data structure', async () => {
      const invalidData = { invalid: 'structure' };

      const formData = new FormData();
      const jsonBlob = new Blob([JSON.stringify(invalidData)], { type: 'application/json' });
      formData.append('file', jsonBlob, 'invalid-structure.json');

      const mockRequest = new Request('http://localhost/api/import-export/import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toMatchObject({
        success: false,
        error: 'Invalid data structure: missing employees array'
      });
    });

    it('should reject invalid employee structure', async () => {
      const invalidEmployeeData = {
        employees: [
          {
            id: '1',
            // Missing name and startDate
            notes: [],
            praise: [],
            feedback: [],
            performanceReviews: []
          }
        ],
        lastUpdated: '2023-01-01T00:00:00.000Z'
      };

      const formData = new FormData();
      const jsonBlob = new Blob([JSON.stringify(invalidEmployeeData)], { type: 'application/json' });
      formData.append('file', jsonBlob, 'invalid-employee.json');

      const mockRequest = new Request('http://localhost/api/import-export/import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toMatchObject({
        success: false,
        error: 'Invalid employee structure: missing required fields (id, name, startDate)'
      });
    });
  });

  describe('POST - ZIP Import (Enhanced)', () => {
    it('should import ZIP data with documents successfully', async () => {
      // Create test ZIP archive
      const zip = new AdmZip();
      
      const employeeData = {
        employees: [
          {
            id: '1',
            name: 'John Doe',
            startDate: '2023-01-01',
            notes: [
              {
                id: 'note1',
                date: '2023-01-01',
                content: 'Test note',
                supportingDocuments: [
                  {
                    id: 'doc1',
                    filename: 'test-doc.pdf',
                    originalName: 'test.pdf',
                    path: '/api/files/test-doc.pdf',
                    mimeType: 'application/pdf',
                    size: 1024,
                    checksum: createHash('sha256').update(Buffer.from('test file content')).digest('hex')
                  }
                ]
              }
            ],
            praise: [],
            feedback: [],
            performanceReviews: []
          }
        ],
        lastUpdated: '2023-01-01T00:00:00.000Z'
      };

      const manifest = {
        exportDate: new Date().toISOString(),
        version: '2.0',
        documentCount: 1,
        employeeCount: 1,
        format: 'employee-notes-archive'
      };

      zip.addFile('employee-data.json', Buffer.from(JSON.stringify(employeeData)));
      zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest)));
      zip.addFile('documents/test-doc.pdf', Buffer.from('test file content'));

      const formData = new FormData();
      const zipBlob = new Blob([zip.toBuffer()], { type: 'application/zip' });
      formData.append('file', zipBlob, 'test-data.zip');

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockEmployeeDB.importFromJSON.mockResolvedValue(undefined);

      const mockRequest = new Request('http://localhost/api/import-export/import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toMatchObject({
        success: true,
        message: 'Data imported successfully. 1 document(s) imported.',
        importedDocsCount: 1,
        checksumErrors: 0
      });
      
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test-doc.pdf'),
        Buffer.from('test file content')
      );
    });

    it('should validate checksums and reject corrupted files', async () => {
      const zip = new AdmZip();
      
      const employeeData = {
        employees: [
          {
            id: '1',
            name: 'John Doe',
            startDate: '2023-01-01',
            notes: [
              {
                id: 'note1',
                date: '2023-01-01',
                content: 'Test note',
                supportingDocuments: [
                  {
                    id: 'doc1',
                    filename: 'test-doc.pdf',
                    originalName: 'test.pdf',
                    path: '/api/files/test-doc.pdf',
                    mimeType: 'application/pdf',
                    size: 1024,
                    checksum: 'wrong-checksum-hash'
                  }
                ]
              }
            ],
            praise: [],
            feedback: [],
            performanceReviews: []
          }
        ],
        lastUpdated: '2023-01-01T00:00:00.000Z'
      };

      const manifest = {
        exportDate: new Date().toISOString(),
        version: '2.0',
        format: 'employee-notes-archive'
      };

      zip.addFile('employee-data.json', Buffer.from(JSON.stringify(employeeData)));
      zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest)));
      zip.addFile('documents/test-doc.pdf', Buffer.from('test file content'));

      const formData = new FormData();
      const zipBlob = new Blob([zip.toBuffer()], { type: 'application/zip' });
      formData.append('file', zipBlob, 'test-data.zip');

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockFs.mkdir.mockResolvedValue(undefined);
      mockEmployeeDB.importFromJSON.mockResolvedValue(undefined);

      const mockRequest = new Request('http://localhost/api/import-export/import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toMatchObject({
        success: true,
        checksumErrors: 1
      });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Checksum mismatch for test-doc.pdf')
      );
      expect(mockFs.writeFile).not.toHaveBeenCalled(); // File should be skipped

      consoleWarnSpy.mockRestore();
    });

    it('should reject ZIP with invalid manifest format', async () => {
      const zip = new AdmZip();
      
      const manifest = {
        exportDate: new Date().toISOString(),
        version: '2.0',
        format: 'invalid-format' // Wrong format
      };

      zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest)));
      zip.addFile('employee-data.json', Buffer.from('{}'));

      const formData = new FormData();
      const zipBlob = new Blob([zip.toBuffer()], { type: 'application/zip' });
      formData.append('file', zipBlob, 'invalid-format.zip');

      const mockRequest = new Request('http://localhost/api/import-export/import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toMatchObject({
        success: false,
        error: 'Invalid archive format'
      });
    });

    it('should reject ZIP missing employee-data.json', async () => {
      const zip = new AdmZip();
      
      const manifest = {
        exportDate: new Date().toISOString(),
        version: '2.0',
        format: 'employee-notes-archive'
      };

      zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest)));
      // Missing employee-data.json

      const formData = new FormData();
      const zipBlob = new Blob([zip.toBuffer()], { type: 'application/zip' });
      formData.append('file', zipBlob, 'missing-data.zip');

      const mockRequest = new Request('http://localhost/api/import-export/import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toMatchObject({
        success: false,
        error: 'Archive missing employee-data.json'
      });
    });

    it('should handle corrupted ZIP files', async () => {
      const formData = new FormData();
      const corruptedZipBlob = new Blob(['corrupted zip data'], { type: 'application/zip' });
      formData.append('file', corruptedZipBlob, 'corrupted.zip');

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockRequest = new Request('http://localhost/api/import-export/import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toMatchObject({
        success: false,
        error: 'Invalid ZIP archive or processing error'
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should return error when no file provided', async () => {
      const formData = new FormData();
      // No file added

      const mockRequest = new Request('http://localhost/api/import-export/import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toMatchObject({
        success: false,
        error: 'No file provided'
      });
    });

    it('should reject unsupported file types', async () => {
      const formData = new FormData();
      const textBlob = new Blob(['text content'], { type: 'text/plain' });
      formData.append('file', textBlob, 'unsupported.txt');

      const mockRequest = new Request('http://localhost/api/import-export/import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toMatchObject({
        success: false,
        error: 'File must be a JSON or ZIP file'
      });
    });

    it('should handle database import errors', async () => {
      const validJsonData = {
        employees: [
          {
            id: '1',
            name: 'John Doe',
            startDate: '2023-01-01',
            notes: [],
            praise: [],
            feedback: [],
            performanceReviews: []
          }
        ],
        lastUpdated: '2023-01-01T00:00:00.000Z'
      };

      const formData = new FormData();
      const jsonBlob = new Blob([JSON.stringify(validJsonData)], { type: 'application/json' });
      formData.append('file', jsonBlob, 'test-data.json');

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockEmployeeDB.importFromJSON.mockRejectedValue(new Error('Database error'));

      const mockRequest = new Request('http://localhost/api/import-export/import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toMatchObject({
        success: false,
        error: 'Failed to import data'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Import error:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });
});