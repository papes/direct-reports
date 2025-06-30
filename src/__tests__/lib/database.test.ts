import { promises as fs } from 'fs';
import { EmployeeDB } from '@/lib/database';
import { Employee, EmployeeDatabase } from '@/types/employee';

jest.mock('fs');
jest.mock('uuid');

const mockFs = fs as jest.Mocked<typeof fs>;
import * as uuid from 'uuid';

describe('EmployeeDB', () => {
  const mockEmployee: Employee = {
    id: 'mock-uuid-1234',
    name: 'John Doe',
    startDate: '2023-01-01',
    notes: [],
    praise: [],
    feedback: [],
    performanceReviews: []
  };

  const mockDatabase: EmployeeDatabase = {
    employees: [mockEmployee],
    lastUpdated: '2023-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (uuid.v4 as jest.Mock).mockReturnValue('mock-uuid-1234');
  });

  describe('ensureDataDir', () => {
    it('should create data directory if it does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('Directory not found'));
      mockFs.mkdir.mockResolvedValue(undefined);

      await EmployeeDB['ensureDataDir']();

      expect(mockFs.access).toHaveBeenCalled();
      expect(mockFs.mkdir).toHaveBeenCalledWith(expect.stringContaining('data'), { recursive: true });
    });

    it('should not create directory if it already exists', async () => {
      mockFs.access.mockResolvedValue(undefined);

      await EmployeeDB['ensureDataDir']();

      expect(mockFs.access).toHaveBeenCalled();
      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });
  });

  describe('loadDatabase', () => {
    it('should load existing database file', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockDatabase));

      const result = await EmployeeDB['loadDatabase']();

      expect(result).toEqual(mockDatabase);
      expect(mockFs.readFile).toHaveBeenCalledWith(expect.stringContaining('employees.json'), 'utf-8');
    });

    it('should create empty database if file does not exist', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await EmployeeDB['loadDatabase']();

      expect(result.employees).toEqual([]);
      expect(result.lastUpdated).toBeDefined();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle invalid JSON gracefully', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('invalid json');
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await EmployeeDB['loadDatabase']();

      expect(result.employees).toEqual([]);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('saveDatabase', () => {
    it('should save database with updated timestamp', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      
      const testDb = { ...mockDatabase };
      await EmployeeDB['saveDatabase'](testDb);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('employees.json'),
        expect.stringContaining('"employees"')
      );
      expect(testDb.lastUpdated).not.toBe(mockDatabase.lastUpdated);
    });
  });

  describe('getAllEmployees', () => {
    it('should return all employees', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockDatabase));

      const result = await EmployeeDB.getAllEmployees();

      expect(result).toEqual([mockEmployee]);
    });

    it('should return empty array when no employees exist', async () => {
      const emptyDb = { employees: [], lastUpdated: '2023-01-01T00:00:00.000Z' };
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(emptyDb));

      const result = await EmployeeDB.getAllEmployees();

      expect(result).toEqual([]);
    });
  });

  describe('getEmployee', () => {
    it('should return employee by id', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockDatabase));

      const result = await EmployeeDB.getEmployee('mock-uuid-1234');

      expect(result).toEqual(mockEmployee);
    });

    it('should return null for non-existent employee', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockDatabase));

      const result = await EmployeeDB.getEmployee('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('createEmployee', () => {
    it('should create new employee with generated id', async () => {
      const emptyDb = { employees: [], lastUpdated: '2023-01-01T00:00:00.000Z' };
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(emptyDb));
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await EmployeeDB.createEmployee('Jane Smith', '2023-06-01');

      expect(result).toEqual({
        id: 'mock-uuid-1234',
        name: 'Jane Smith',
        startDate: '2023-06-01',
        notes: [],
        praise: [],
        feedback: [],
        performanceReviews: []
      });
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('addNote', () => {
    it('should add note to existing employee', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockDatabase));
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await EmployeeDB.addNote('mock-uuid-1234', 'Test note content');

      expect(result).toEqual({
        id: 'mock-uuid-1234',
        date: expect.any(String),
        content: 'Test note content',
        supportingDocuments: []
      });
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should add note with custom date', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockDatabase));
      mockFs.writeFile.mockResolvedValue(undefined);

      const customDate = '2023-12-25';
      const result = await EmployeeDB.addNote('mock-uuid-1234', 'Holiday note', customDate);

      expect(result.date).toBe('2023-12-25T00:00:00.000Z');
    });

    it('should add note with supporting documents', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockDatabase));
      mockFs.writeFile.mockResolvedValue(undefined);

      const supportingDocs = [{
        id: 'doc-1',
        filename: 'test.pdf',
        originalName: 'original.pdf',
        path: '/api/files/test.pdf',
        mimeType: 'application/pdf',
        size: 1024
      }];

      const result = await EmployeeDB.addNote('mock-uuid-1234', 'Note with docs', undefined, supportingDocs);

      expect(result.supportingDocuments).toEqual(supportingDocs);
    });

    it('should throw error for non-existent employee', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockDatabase));

      await expect(EmployeeDB.addNote('non-existent-id', 'Test note'))
        .rejects.toThrow('Employee not found');
    });
  });

  describe('addPraise', () => {
    it('should add praise to existing employee', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockDatabase));
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await EmployeeDB.addPraise('mock-uuid-1234', 'Great work!');

      expect(result).toEqual({
        id: 'mock-uuid-1234',
        date: expect.any(String),
        content: 'Great work!'
      });
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should throw error for non-existent employee', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockDatabase));

      await expect(EmployeeDB.addPraise('non-existent-id', 'Great work!'))
        .rejects.toThrow('Employee not found');
    });
  });

  describe('addFeedback', () => {
    it('should add feedback to existing employee', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockDatabase));
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await EmployeeDB.addFeedback('mock-uuid-1234', 'Needs improvement');

      expect(result).toEqual({
        id: 'mock-uuid-1234',
        date: expect.any(String),
        content: 'Needs improvement'
      });
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should throw error for non-existent employee', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockDatabase));

      await expect(EmployeeDB.addFeedback('non-existent-id', 'Needs improvement'))
        .rejects.toThrow('Employee not found');
    });
  });

  describe('exportToJSON', () => {
    it('should export database as JSON string', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockDatabase));

      const result = await EmployeeDB.exportToJSON();

      expect(JSON.parse(result)).toEqual(mockDatabase);
    });
  });

  describe('addPerformanceReview', () => {
    it('should add performance review to existing employee', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockDatabase));
      mockFs.writeFile.mockResolvedValue(undefined);

      const performanceReview = {
        id: 'review-1',
        filename: 'review.pdf',
        originalName: 'performance-review.pdf',
        path: '/api/files/review.pdf',
        mimeType: 'application/pdf',
        size: 2048
      };

      const result = await EmployeeDB.addPerformanceReview('mock-uuid-1234', performanceReview);

      expect(result).toEqual(performanceReview);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should throw error for non-existent employee', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockDatabase));

      const performanceReview = {
        id: 'review-1',
        filename: 'review.pdf',
        originalName: 'performance-review.pdf',
        path: '/api/files/review.pdf',
        mimeType: 'application/pdf',
        size: 2048
      };

      await expect(EmployeeDB.addPerformanceReview('non-existent-id', performanceReview))
        .rejects.toThrow('Employee not found');
    });
  });

  describe('importFromJSON', () => {
    it('should import database from JSON string', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const importData = JSON.stringify(mockDatabase);
      await EmployeeDB.importFromJSON(importData);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('employees.json'),
        expect.stringContaining('"employees"')
      );
    });

    it('should throw error for invalid JSON', async () => {
      await expect(EmployeeDB.importFromJSON('invalid json'))
        .rejects.toThrow();
    });
  });
});