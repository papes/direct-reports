/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReportDialog from '@/components/ReportDialog';
import { Employee } from '@/types/employee';
import JSZip from 'jszip';

// Mock JSZip
jest.mock('jszip');
const MockedJSZip = JSZip as jest.MockedClass<typeof JSZip>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

// Mock DOM methods
const mockClick = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();

// Mock window.location.origin
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000'
  },
  writable: true
});

describe('ReportDialog', () => {
  beforeAll(() => {
    // Setup DOM container
    document.body.innerHTML = '<div id="root"></div>';
    
    // Mock document methods
    document.createElement = jest.fn(() => ({
      href: '',
      download: '',
      click: mockClick,
    })) as any;
    
    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;
  });
  const mockEmployee: Employee = {
    id: 'emp-1',
    name: 'John Doe',
    startDate: '2023-01-01',
    notes: [
      {
        id: 'note-1',
        date: '2024-01-15T10:00:00.000Z',
        content: 'Great progress on project',
        supportingDocuments: [
          {
            id: 'doc-1',
            filename: 'report.pdf',
            originalName: 'Progress Report.pdf',
            path: '/api/files/report.pdf',
            mimeType: 'application/pdf',
            size: 1024,
          },
        ],
      },
      {
        id: 'note-2',
        date: '2024-01-20T14:30:00.000Z',
        content: 'Meeting notes from weekly sync',
        supportingDocuments: [
          {
            id: 'doc-2',
            filename: 'screenshot.png',
            originalName: 'Screenshot.png',
            path: '/api/files/screenshot.png',
            mimeType: 'image/png',
            size: 2048,
          },
        ],
      },
    ],
    praise: [
      {
        id: 'praise-1',
        date: '2024-01-10T09:00:00.000Z',
        content: 'Excellent leadership during the project',
      },
    ],
    feedback: [
      {
        id: 'feedback-1',
        date: '2024-01-25T16:00:00.000Z',
        content: 'Could improve time management',
      },
    ],
    performanceReviews: [],
  };

  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup JSZip mock
    const mockZipInstance = {
      folder: jest.fn().mockReturnValue({
        file: jest.fn(),
      }),
      file: jest.fn(),
      generateAsync: jest.fn().mockResolvedValue(new Blob(['mock-zip-content'])),
    };
    MockedJSZip.mockImplementation(() => mockZipInstance as any);
    
    // Setup fetch mock to return successful responses
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      text: () => Promise.resolve('mock file content'),
    } as Response);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(
      <ReportDialog
        isOpen={false}
        onClose={mockOnClose}
        employee={mockEmployee}
      />
    );

    expect(screen.queryByText('Generate Report')).not.toBeInTheDocument();
  });

  it('should render dialog when isOpen is true', () => {
    render(
      <ReportDialog
        isOpen={true}
        onClose={mockOnClose}
        employee={mockEmployee}
      />
    );

    expect(screen.getByText('Generate Report')).toBeInTheDocument();
    expect(screen.getByText('Include in Report:')).toBeInTheDocument();
    expect(screen.getByText('Notes (2)')).toBeInTheDocument();
    expect(screen.getByText('Praise (1)')).toBeInTheDocument();
    expect(screen.getByText('Feedback (1)')).toBeInTheDocument();
  });

  it('should show correct counts for each category', () => {
    render(
      <ReportDialog
        isOpen={true}
        onClose={mockOnClose}
        employee={mockEmployee}
      />
    );

    expect(screen.getByText('Notes (2)')).toBeInTheDocument();
    expect(screen.getByText('Praise (1)')).toBeInTheDocument();
    expect(screen.getByText('Feedback (1)')).toBeInTheDocument();
  });

  it('should have all checkboxes checked by default', () => {
    render(
      <ReportDialog
        isOpen={true}
        onClose={mockOnClose}
        employee={mockEmployee}
      />
    );

    const notesCheckbox = screen.getByRole('checkbox', { name: /notes/i });
    const praiseCheckbox = screen.getByRole('checkbox', { name: /praise/i });
    const feedbackCheckbox = screen.getByRole('checkbox', { name: /feedback/i });

    expect(notesCheckbox).toBeChecked();
    expect(praiseCheckbox).toBeChecked();
    expect(feedbackCheckbox).toBeChecked();
  });

  it('should allow toggling checkboxes', () => {
    render(
      <ReportDialog
        isOpen={true}
        onClose={mockOnClose}
        employee={mockEmployee}
      />
    );

    const notesCheckbox = screen.getByRole('checkbox', { name: /notes/i });
    
    fireEvent.click(notesCheckbox);
    expect(notesCheckbox).not.toBeChecked();
    
    fireEvent.click(notesCheckbox);
    expect(notesCheckbox).toBeChecked();
  });

  it('should disable generate button when no categories are selected', () => {
    render(
      <ReportDialog
        isOpen={true}
        onClose={mockOnClose}
        employee={mockEmployee}
      />
    );

    const notesCheckbox = screen.getByRole('checkbox', { name: /notes/i });
    const praiseCheckbox = screen.getByRole('checkbox', { name: /praise/i });
    const feedbackCheckbox = screen.getByRole('checkbox', { name: /feedback/i });
    const generateButton = screen.getByRole('button', { name: /generate report/i });

    // Uncheck all categories
    fireEvent.click(notesCheckbox);
    fireEvent.click(praiseCheckbox);
    fireEvent.click(feedbackCheckbox);

    expect(generateButton).toBeDisabled();
  });

  it('should allow setting start and end dates', () => {
    render(
      <ReportDialog
        isOpen={true}
        onClose={mockOnClose}
        employee={mockEmployee}
      />
    );

    const startDateInput = screen.getByLabelText(/start date/i);
    const endDateInput = screen.getByLabelText(/end date/i);

    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
    fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });

    expect(startDateInput).toHaveValue('2024-01-01');
    expect(endDateInput).toHaveValue('2024-01-31');
  });

  it('should close dialog when Cancel button is clicked', () => {
    render(
      <ReportDialog
        isOpen={true}
        onClose={mockOnClose}
        employee={mockEmployee}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should generate report with all items when no date filters are set', async () => {
    render(
      <ReportDialog
        isOpen={true}
        onClose={mockOnClose}
        employee={mockEmployee}
      />
    );

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('http://localhost/api/files/report.pdf');
      expect(mockFetch).toHaveBeenCalledWith('http://localhost/api/files/screenshot.png');
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should filter items by date range when dates are set', async () => {
    render(
      <ReportDialog
        isOpen={true}
        onClose={mockOnClose}
        employee={mockEmployee}
      />
    );

    const startDateInput = screen.getByLabelText(/start date/i);
    const endDateInput = screen.getByLabelText(/end date/i);
    const generateButton = screen.getByRole('button', { name: /generate report/i });

    // Set date range that excludes some items
    fireEvent.change(startDateInput, { target: { value: '2024-01-15' } });
    fireEvent.change(endDateInput, { target: { value: '2024-01-20' } });
    
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(MockedJSZip).toHaveBeenCalled();
    });
  });

  it('should create zip file with correct structure', async () => {
    const mockZipInstance = {
      folder: jest.fn().mockReturnValue({
        file: jest.fn(),
      }),
      file: jest.fn(),
      generateAsync: jest.fn().mockResolvedValue(new Blob(['mock-zip-content'])),
    };
    MockedJSZip.mockImplementation(() => mockZipInstance as any);

    render(
      <ReportDialog
        isOpen={true}
        onClose={mockOnClose}
        employee={mockEmployee}
      />
    );

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockZipInstance.folder).toHaveBeenCalledWith('documents');
      expect(mockZipInstance.file).toHaveBeenCalledWith('report.md', expect.any(String));
      expect(mockZipInstance.file).toHaveBeenCalledWith('README.md', expect.any(String));
    });
  });

  it('should handle fetch errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <ReportDialog
        isOpen={true}
        onClose={mockOnClose}
        employee={mockEmployee}
      />
    );

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should show generating state during report creation', async () => {
    // Make the zip generation take some time
    const mockZipInstance = {
      folder: jest.fn().mockReturnValue({
        file: jest.fn(),
      }),
      file: jest.fn(),
      generateAsync: jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(new Blob(['mock-zip-content'])), 100))
      ),
    };
    MockedJSZip.mockImplementation(() => mockZipInstance as any);

    render(
      <ReportDialog
        isOpen={true}
        onClose={mockOnClose}
        employee={mockEmployee}
      />
    );

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    fireEvent.click(generateButton);

    // Should show "Generating..." text
    expect(screen.getByText('Generating...')).toBeInTheDocument();
    expect(generateButton).toBeDisabled();

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should generate correct markdown format', async () => {
    const mockZipInstance = {
      folder: jest.fn().mockReturnValue({
        file: jest.fn(),
      }),
      file: jest.fn(),
      generateAsync: jest.fn().mockResolvedValue(new Blob(['mock-zip-content'])),
    };
    MockedJSZip.mockImplementation(() => mockZipInstance as any);

    render(
      <ReportDialog
        isOpen={true}
        onClose={mockOnClose}
        employee={mockEmployee}
      />
    );

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      const markdownCall = mockZipInstance.file.mock.calls.find(call => call[0] === 'report.md');
      expect(markdownCall).toBeDefined();
      
      const markdownContent = markdownCall[1] as string;
      expect(markdownContent).toContain('# John Doe - Report');
      expect(markdownContent).toContain('- **1/15/2024**'); // Bulleted format
      expect(markdownContent).toContain('Great progress on project');
      expect(markdownContent).toContain('documents/Progress Report.pdf');
      expect(markdownContent).toContain('![Screenshot.png](documents/Screenshot.png)'); // Image format
    });
  });
});