import { NextRequest } from 'next/server';
import { POST } from '@/app/api/employees/[id]/notes/route';
import { EmployeeDB } from '@/lib/database';
import { FileUploadService } from '@/lib/fileUpload';

jest.mock('@/lib/database');
jest.mock('@/lib/fileUpload');

const mockEmployeeDB = EmployeeDB as jest.Mocked<typeof EmployeeDB>;
const mockFileUploadService = FileUploadService as jest.Mocked<typeof FileUploadService>;

describe('/api/employees/[id]/notes', () => {
  const mockEmployee = {
    id: 'test-id',
    name: 'John Doe',
    startDate: '2023-01-01',
    notes: [],
    praise: [],
    feedback: []
  };

  const mockNote = {
    id: 'note-id',
    date: '2023-01-01T00:00:00.000Z',
    content: 'Test note content',
    supportingDocuments: []
  };

  const mockSupportingDocument = {
    id: 'doc-id',
    filename: 'test.pdf',
    originalName: 'original.pdf',
    path: '/api/files/test.pdf',
    mimeType: 'application/pdf',
    size: 1024
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should add note successfully without files', async () => {
      mockEmployeeDB.getEmployee.mockResolvedValue(mockEmployee);
      mockEmployeeDB.addNote.mockResolvedValue(mockNote);

      const formData = new FormData();
      formData.append('content', 'Test note content');
      formData.append('date', '2023-01-01');

      const request = new NextRequest('http://localhost/api/employees/test-id/notes', {
        method: 'POST',
        body: formData
      });
      const params = Promise.resolve({ id: 'test-id' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockNote);
      expect(mockEmployeeDB.getEmployee).toHaveBeenCalledWith('test-id');
      expect(mockEmployeeDB.addNote).toHaveBeenCalledWith('test-id', 'Test note content', '2023-01-01', []);
    });

    it('should add note with supporting documents', async () => {
      mockEmployeeDB.getEmployee.mockResolvedValue(mockEmployee);
      mockEmployeeDB.addNote.mockResolvedValue({
        ...mockNote,
        supportingDocuments: [mockSupportingDocument]
      });
      mockFileUploadService.uploadFile.mockResolvedValue(mockSupportingDocument);

      const formData = new FormData();
      formData.append('content', 'Test note content');
      formData.append('date', '2023-01-01');
      
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      formData.append('files', mockFile);

      const request = new NextRequest('http://localhost/api/employees/test-id/notes', {
        method: 'POST',
        body: formData
      });
      const params = Promise.resolve({ id: 'test-id' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.supportingDocuments).toEqual([mockSupportingDocument]);
      expect(mockFileUploadService.uploadFile).toHaveBeenCalledWith(
        mockFile,
        'John Doe',
        '2023-01-01'
      );
    });

    it('should return 400 when content is missing', async () => {
      const formData = new FormData();
      formData.append('date', '2023-01-01');

      const request = new NextRequest('http://localhost/api/employees/test-id/notes', {
        method: 'POST',
        body: formData
      });
      const params = Promise.resolve({ id: 'test-id' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Content is required' });
      expect(mockEmployeeDB.getEmployee).not.toHaveBeenCalled();
    });

    it('should return 404 when employee not found', async () => {
      mockEmployeeDB.getEmployee.mockResolvedValue(null);

      const formData = new FormData();
      formData.append('content', 'Test note content');

      const request = new NextRequest('http://localhost/api/employees/non-existent/notes', {
        method: 'POST',
        body: formData
      });
      const params = Promise.resolve({ id: 'non-existent' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Employee not found' });
      expect(mockEmployeeDB.addNote).not.toHaveBeenCalled();
    });

    it('should handle file upload errors gracefully', async () => {
      mockEmployeeDB.getEmployee.mockResolvedValue(mockEmployee);
      mockEmployeeDB.addNote.mockResolvedValue(mockNote);
      mockFileUploadService.uploadFile.mockRejectedValue(new Error('File upload error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const formData = new FormData();
      formData.append('content', 'Test note content');
      
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      formData.append('files', mockFile);

      const request = new NextRequest('http://localhost/api/employees/test-id/notes', {
        method: 'POST',
        body: formData
      });
      const params = Promise.resolve({ id: 'test-id' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.supportingDocuments).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error uploading file:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should ignore empty files', async () => {
      mockEmployeeDB.getEmployee.mockResolvedValue(mockEmployee);
      mockEmployeeDB.addNote.mockResolvedValue(mockNote);

      const formData = new FormData();
      formData.append('content', 'Test note content');
      
      const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });
      formData.append('files', emptyFile);

      const request = new NextRequest('http://localhost/api/employees/test-id/notes', {
        method: 'POST',
        body: formData
      });
      const params = Promise.resolve({ id: 'test-id' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(mockFileUploadService.uploadFile).not.toHaveBeenCalled();
      expect(data.supportingDocuments).toEqual([]);
    });

    it('should use current date when date is not provided', async () => {
      mockEmployeeDB.getEmployee.mockResolvedValue(mockEmployee);
      mockEmployeeDB.addNote.mockResolvedValue(mockNote);

      const formData = new FormData();
      formData.append('content', 'Test note content');

      const request = new NextRequest('http://localhost/api/employees/test-id/notes', {
        method: 'POST',
        body: formData
      });
      const params = Promise.resolve({ id: 'test-id' });

      const response = await POST(request, { params });

      expect(response.status).toBe(201);
      expect(mockEmployeeDB.addNote).toHaveBeenCalledWith('test-id', 'Test note content', null, []);
    });

    it('should handle database errors during note addition', async () => {
      mockEmployeeDB.getEmployee.mockResolvedValue(mockEmployee);
      mockEmployeeDB.addNote.mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const formData = new FormData();
      formData.append('content', 'Test note content');

      const request = new NextRequest('http://localhost/api/employees/test-id/notes', {
        method: 'POST',
        body: formData
      });
      const params = Promise.resolve({ id: 'test-id' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to add note' });
      expect(consoleSpy).toHaveBeenCalledWith('Error adding note:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle specific Employee not found error', async () => {
      mockEmployeeDB.getEmployee.mockResolvedValue(mockEmployee);
      mockEmployeeDB.addNote.mockRejectedValue(new Error('Employee not found'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const formData = new FormData();
      formData.append('content', 'Test note content');

      const request = new NextRequest('http://localhost/api/employees/test-id/notes', {
        method: 'POST',
        body: formData
      });
      const params = Promise.resolve({ id: 'test-id' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Employee not found' });
      
      consoleSpy.mockRestore();
    });
  });
});