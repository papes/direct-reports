import { promises as fs } from 'fs';
import { FileUploadService } from '@/lib/fileUpload';
import { SupportingDocument } from '@/types/employee';

jest.mock('fs');
jest.mock('uuid');

const mockFs = fs as jest.Mocked<typeof fs>;
import * as uuid from 'uuid';

describe('FileUploadService', () => {
  const mockFile = {
    name: 'test-document.pdf',
    size: 1024,
    type: 'application/pdf',
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024))
  } as unknown as File;

  beforeEach(() => {
    jest.clearAllMocks();
    (uuid.v4 as jest.Mock).mockReturnValue('mock-file-uuid');
  });

  describe('ensureUploadDir', () => {
    it('should create upload directory if it does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('Directory not found'));
      mockFs.mkdir.mockResolvedValue(undefined);

      await FileUploadService['ensureUploadDir']();

      expect(mockFs.access).toHaveBeenCalledWith(expect.stringContaining('resources'));
      expect(mockFs.mkdir).toHaveBeenCalledWith(expect.stringContaining('resources'), { recursive: true });
    });

    it('should not create directory if it already exists', async () => {
      mockFs.access.mockResolvedValue(undefined);

      await FileUploadService['ensureUploadDir']();

      expect(mockFs.access).toHaveBeenCalled();
      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });
  });

  describe('uploadFile', () => {
    beforeEach(() => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it('should upload valid file successfully', async () => {
      const result = await FileUploadService.uploadFile(mockFile, 'John Doe', '2023-01-01');

      const expectedDocument: SupportingDocument = {
        id: 'mock-file-uuid',
        filename: 'supporting-doc-John-Doe-2023-01-01-mock-file-uuid.pdf',
        originalName: 'test-document.pdf',
        path: '/api/files/supporting-doc-John-Doe-2023-01-01-mock-file-uuid.pdf',
        mimeType: 'application/pdf',
        size: 1024
      };

      expect(result).toEqual(expectedDocument);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('supporting-doc-John-Doe-2023-01-01-mock-file-uuid.pdf'),
        expect.any(Buffer)
      );
    });

    it('should sanitize employee name in filename', async () => {
      const result = await FileUploadService.uploadFile(mockFile, 'John O\'Connor Jr.', '2023-01-01');

      expect(result.filename).toContain('John-O-Connor-Jr-');
      expect(result.filename).not.toContain('\'');
      expect(result.filename).not.toContain(' ');
    });

    it('should format date correctly in filename', async () => {
      const result = await FileUploadService.uploadFile(mockFile, 'John Doe', '2023-12-25T10:30:00.000Z');

      expect(result.filename).toContain('2023-12-25');
    });

    it('should throw error for oversized file', async () => {
      const largeMockFile = {
        ...mockFile,
        size: 11 * 1024 * 1024 // 11MB, exceeds 10MB limit
      } as File;

      await expect(FileUploadService.uploadFile(largeMockFile, 'John Doe', '2023-01-01'))
        .rejects.toThrow('File size exceeds 10MB limit');

      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should throw error for invalid file type', async () => {
      const invalidMockFile = {
        ...mockFile,
        name: 'test.exe'
      } as File;

      await expect(FileUploadService.uploadFile(invalidMockFile, 'John Doe', '2023-01-01'))
        .rejects.toThrow('File type .exe is not allowed');

      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle different allowed file extensions', async () => {
      const testCases = [
        { name: 'doc.doc', expected: '.doc' },
        { name: 'document.docx', expected: '.docx' },
        { name: 'file.pdf', expected: '.pdf' },
        { name: 'image.png', expected: '.png' },
        { name: 'photo.jpg', expected: '.jpg' },
        { name: 'picture.jpeg', expected: '.jpeg' }
      ];

      for (const testCase of testCases) {
        const testFile = { ...mockFile, name: testCase.name } as File;
        const result = await FileUploadService.uploadFile(testFile, 'John Doe', '2023-01-01');
        
        expect(result.filename).toMatch(new RegExp(`${testCase.expected.replace('.', '\\.')}$`));
      }
    });

    it('should handle case-insensitive file extensions', async () => {
      const upperCaseFile = { ...mockFile, name: 'TEST.PDF' } as File;
      
      const result = await FileUploadService.uploadFile(upperCaseFile, 'John Doe', '2023-01-01');
      
      expect(result.filename).toMatch(/\.PDF$/i);
    });

    it('should convert file to buffer correctly', async () => {
      const mockArrayBuffer = new ArrayBuffer(1024);
      const mockFileWithBuffer = {
        ...mockFile,
        arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer)
      } as unknown as File;

      await FileUploadService.uploadFile(mockFileWithBuffer, 'John Doe', '2023-01-01');

      expect(mockFileWithBuffer.arrayBuffer).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        Buffer.from(mockArrayBuffer)
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockFs.unlink.mockResolvedValue(undefined);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await FileUploadService.deleteFile('test-file.pdf');

      expect(mockFs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('test-file.pdf')
      );
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle deletion errors gracefully', async () => {
      const deleteError = new Error('File not found');
      mockFs.unlink.mockRejectedValue(deleteError);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await FileUploadService.deleteFile('non-existent-file.pdf');

      expect(mockFs.unlink).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Error deleting file:', deleteError);
      
      consoleSpy.mockRestore();
    });
  });

  describe('isValidFileType', () => {
    it('should return true for allowed file types', () => {
      const allowedTypes = ['.doc', '.docx', '.pdf', '.png', '.jpg', '.jpeg'];
      
      allowedTypes.forEach(ext => {
        expect(FileUploadService.isValidFileType(`test${ext}`)).toBe(true);
        expect(FileUploadService.isValidFileType(`test${ext.toUpperCase()}`)).toBe(true);
      });
    });

    it('should return false for disallowed file types', () => {
      const disallowedTypes = ['.exe', '.bat', '.sh', '.js', '.html', '.txt'];
      
      disallowedTypes.forEach(ext => {
        expect(FileUploadService.isValidFileType(`test${ext}`)).toBe(false);
      });
    });

    it('should handle files without extensions', () => {
      expect(FileUploadService.isValidFileType('filename-without-extension')).toBe(false);
    });

    it('should handle empty filenames', () => {
      expect(FileUploadService.isValidFileType('')).toBe(false);
    });
  });
});