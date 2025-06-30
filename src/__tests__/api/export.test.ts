import { GET } from '@/app/api/import-export/export/route';
import { EmployeeDB } from '@/lib/database';
import { promises as fs } from 'fs';
import AdmZip from 'adm-zip';

jest.mock('@/lib/database');
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    mkdir: jest.fn(),
  },
}));

const mockEmployeeDB = EmployeeDB as jest.Mocked<typeof EmployeeDB>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('/api/import-export/export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET - JSON Export (Legacy)', () => {
    it('should export data successfully as JSON', async () => {
      const mockJsonData = JSON.stringify({
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
      });

      mockEmployeeDB.exportToJSON.mockResolvedValue(mockJsonData);

      const mockRequest = new Request('http://localhost/api/import-export/export?format=json');
      const response = await GET(mockRequest);
      const responseText = await response.text();

      expect(response.status).toBe(200);
      expect(responseText).toBe(mockJsonData);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Content-Disposition')).toMatch(
        /attachment; filename="employee-data-\d{4}-\d{2}-\d{2}\.json"/
      );
      expect(mockEmployeeDB.exportToJSON).toHaveBeenCalledTimes(1);
    });

    it('should default to JSON format when no format specified', async () => {
      const mockJsonData = '{"test": "data"}';
      mockEmployeeDB.exportToJSON.mockResolvedValue(mockJsonData);

      const mockRequest = new Request('http://localhost/api/import-export/export');
      const response = await GET(mockRequest);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('GET - ZIP Export (Enhanced)', () => {
    it('should export data successfully as ZIP with documents', async () => {
      const mockJsonData = JSON.stringify({
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
                    size: 1024
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
      });

      const mockFileBuffer = Buffer.from('test file content');
      mockEmployeeDB.exportToJSON.mockResolvedValue(mockJsonData);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(mockFileBuffer);

      const mockRequest = new Request('http://localhost/api/import-export/export?format=zip');
      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/zip');
      expect(response.headers.get('Content-Disposition')).toMatch(
        /attachment; filename="employee-data-\d{4}-\d{2}-\d{2}\.zip"/
      );

      // Verify ZIP contents
      const zipBuffer = Buffer.from(await response.arrayBuffer());
      const zip = new AdmZip(zipBuffer);
      
      const entries = zip.getEntries();
      const entryNames = entries.map(entry => entry.entryName);
      
      expect(entryNames).toContain('employee-data.json');
      expect(entryNames).toContain('manifest.json');
      expect(entryNames).toContain('documents/test-doc.pdf');

      // Verify manifest content
      const manifestEntry = zip.getEntry('manifest.json');
      const manifest = JSON.parse(manifestEntry!.getData().toString('utf8'));
      expect(manifest).toMatchObject({
        version: '2.0',
        format: 'employee-notes-archive',
        documentCount: 1,
        employeeCount: 1
      });
      expect(manifest.exportDate).toBeDefined();
    });

    it('should handle missing documents gracefully in ZIP export', async () => {
      const mockJsonData = JSON.stringify({
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
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockEmployeeDB.exportToJSON.mockResolvedValue(mockJsonData);
      mockFs.access.mockRejectedValue(new Error('File not found'));

      const mockRequest = new Request('http://localhost/api/import-export/export?format=zip');
      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Document not found: missing-doc.pdf');

      // Verify the note has no supporting documents in the exported data
      const zipBuffer = Buffer.from(await response.arrayBuffer());
      const zip = new AdmZip(zipBuffer);
      
      const dataEntry = zip.getEntry('employee-data.json');
      const exportedData = JSON.parse(dataEntry!.getData().toString('utf8'));
      expect(exportedData.employees[0].notes[0].supportingDocuments).toHaveLength(0);

      consoleWarnSpy.mockRestore();
    });

    it('should create ZIP with checksums for document validation', async () => {
      const mockJsonData = JSON.stringify({
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
                    size: 1024
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
      });

      const mockFileBuffer = Buffer.from('test file content');
      mockEmployeeDB.exportToJSON.mockResolvedValue(mockJsonData);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(mockFileBuffer);

      const mockRequest = new Request('http://localhost/api/import-export/export?format=zip');
      const response = await GET(mockRequest);

      const zipBuffer = Buffer.from(await response.arrayBuffer());
      const zip = new AdmZip(zipBuffer);
      
      const dataEntry = zip.getEntry('employee-data.json');
      const exportedData = JSON.parse(dataEntry!.getData().toString('utf8'));
      
      // Verify checksum was added
      const doc = exportedData.employees[0].notes[0].supportingDocuments[0];
      expect(doc.checksum).toBeDefined();
      expect(typeof doc.checksum).toBe('string');
      expect(doc.checksum).toHaveLength(64); // SHA256 hex length
    });
  });

  describe('Error Handling', () => {
    it('should handle export errors', async () => {
      mockEmployeeDB.exportToJSON.mockRejectedValue(new Error('Export error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockRequest = new Request('http://localhost/api/import-export/export');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to export data' });
      expect(consoleSpy).toHaveBeenCalledWith('Export error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should return error for invalid format parameter', async () => {
      const mockRequest = new Request('http://localhost/api/import-export/export?format=invalid');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Invalid format parameter. Use "json" or "zip"' });
    });
  });
});