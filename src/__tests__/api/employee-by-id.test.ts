import { NextRequest } from 'next/server';
import { GET } from '@/app/api/employees/[id]/route';
import { EmployeeDB } from '@/lib/database';

jest.mock('@/lib/database');

const mockEmployeeDB = EmployeeDB as jest.Mocked<typeof EmployeeDB>;

describe('/api/employees/[id]', () => {
  const mockEmployee = {
    id: 'test-id',
    name: 'John Doe',
    startDate: '2023-01-01',
    notes: [],
    praise: [],
    feedback: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return employee by id successfully', async () => {
      mockEmployeeDB.getEmployee.mockResolvedValue(mockEmployee);

      const request = new NextRequest('http://localhost/api/employees/test-id');
      const params = Promise.resolve({ id: 'test-id' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockEmployee);
      expect(mockEmployeeDB.getEmployee).toHaveBeenCalledWith('test-id');
    });

    it('should return 404 when employee not found', async () => {
      mockEmployeeDB.getEmployee.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/employees/non-existent');
      const params = Promise.resolve({ id: 'non-existent' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Employee not found' });
      expect(mockEmployeeDB.getEmployee).toHaveBeenCalledWith('non-existent');
    });

    it('should handle database errors', async () => {
      mockEmployeeDB.getEmployee.mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const request = new NextRequest('http://localhost/api/employees/test-id');
      const params = Promise.resolve({ id: 'test-id' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to fetch employee' });
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching employee:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle params resolution errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const request = new NextRequest('http://localhost/api/employees/test-id');
      const params = Promise.reject(new Error('Params error'));

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to fetch employee' });
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});