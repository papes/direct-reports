import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/employees/route';
import { EmployeeDB } from '@/lib/database';

jest.mock('@/lib/database');

const mockEmployeeDB = EmployeeDB as jest.Mocked<typeof EmployeeDB>;

describe('/api/employees', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return all employees successfully', async () => {
      const mockEmployees = [
        {
          id: '1',
          name: 'John Doe',
          startDate: '2023-01-01',
          notes: [],
          praise: [],
          feedback: [],
          performanceReviews: []
        }
      ];
      
      mockEmployeeDB.getAllEmployees.mockResolvedValue(mockEmployees);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockEmployees);
      expect(mockEmployeeDB.getAllEmployees).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors', async () => {
      mockEmployeeDB.getAllEmployees.mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to fetch employees' });
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching employees:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('POST', () => {
    it('should create employee successfully', async () => {
      const mockEmployee = {
        id: '1',
        name: 'Jane Smith',
        startDate: '2023-06-01',
        notes: [],
        praise: [],
        feedback: [],
        performanceReviews: []
      };

      mockEmployeeDB.createEmployee.mockResolvedValue(mockEmployee);

      const requestBody = { name: 'Jane Smith', startDate: '2023-06-01' };
      const request = new NextRequest('http://localhost/api/employees', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockEmployee);
      expect(mockEmployeeDB.createEmployee).toHaveBeenCalledWith('Jane Smith', '2023-06-01');
    });

    it('should return 400 when name is missing', async () => {
      const requestBody = { startDate: '2023-06-01' };
      const request = new NextRequest('http://localhost/api/employees', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Name and start date are required' });
      expect(mockEmployeeDB.createEmployee).not.toHaveBeenCalled();
    });

    it('should return 400 when startDate is missing', async () => {
      const requestBody = { name: 'Jane Smith' };
      const request = new NextRequest('http://localhost/api/employees', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Name and start date are required' });
      expect(mockEmployeeDB.createEmployee).not.toHaveBeenCalled();
    });

    it('should return 400 when both name and startDate are missing', async () => {
      const requestBody = {};
      const request = new NextRequest('http://localhost/api/employees', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Name and start date are required' });
      expect(mockEmployeeDB.createEmployee).not.toHaveBeenCalled();
    });

    it('should handle database errors during creation', async () => {
      mockEmployeeDB.createEmployee.mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const requestBody = { name: 'Jane Smith', startDate: '2023-06-01' };
      const request = new NextRequest('http://localhost/api/employees', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to create employee' });
      expect(consoleSpy).toHaveBeenCalledWith('Error creating employee:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost/api/employees', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to create employee' });
    });
  });
});