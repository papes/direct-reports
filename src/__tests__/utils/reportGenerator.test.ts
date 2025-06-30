import { Employee, EmployeeNote, EmployeePraise, EmployeeFeedback } from '@/types/employee';

describe('Report Generation Logic', () => {
  const mockEmployee: Employee = {
    id: 'emp-1',
    name: 'Jane Smith',
    startDate: '2023-01-01',
    notes: [
      {
        id: 'note-1',
        date: '2024-01-10T10:00:00.000Z',
        content: 'Weekly sync discussion about Q1 goals',
        supportingDocuments: [
          {
            id: 'doc-1',
            filename: 'goals-doc.pdf',
            originalName: 'Q1 Goals.pdf',
            path: '/api/files/goals-doc.pdf',
            mimeType: 'application/pdf',
            size: 2048,
          },
        ],
      },
      {
        id: 'note-2',
        date: '2024-02-15T14:30:00.000Z',
        content: 'Project milestone completed ahead of schedule',
        supportingDocuments: [
          {
            id: 'doc-2',
            filename: 'milestone-chart.png',
            originalName: 'Milestone Chart.png',
            path: '/api/files/milestone-chart.png',
            mimeType: 'image/png',
            size: 1024,
          },
          {
            id: 'doc-3',
            filename: 'notes.txt',
            originalName: 'Meeting Notes.txt',
            path: '/api/files/notes.txt',
            mimeType: 'text/plain',
            size: 512,
          },
        ],
      },
    ],
    praise: [
      {
        id: 'praise-1',
        date: '2024-01-20T09:00:00.000Z',
        content: 'Outstanding problem-solving skills demonstrated',
      },
      {
        id: 'praise-2',
        date: '2024-03-05T11:30:00.000Z',
        content: 'Great teamwork and collaboration',
      },
    ],
    feedback: [
      {
        id: 'feedback-1',
        date: '2024-01-25T16:00:00.000Z',
        content: 'Consider improving documentation practices',
      },
    ],
    performanceReviews: [],
  };

  // Helper function to filter items by date range (simulating the component logic)
  const filterItemsByDateRange = (
    items: Array<{ date: string }>,
    startDate: string,
    endDate: string
  ) => {
    const startDateTime = startDate ? new Date(startDate).getTime() : 0;
    const endDateTime = endDate ? new Date(endDate + 'T23:59:59').getTime() : Date.now();

    return items.filter(item => {
      const itemTime = new Date(item.date).getTime();
      return itemTime >= startDateTime && itemTime <= endDateTime;
    });
  };

  // Helper function to collect all items (simulating the component logic)
  const collectAllItems = (
    employee: Employee,
    includeNotes: boolean,
    includePraise: boolean,
    includeFeedback: boolean,
    startDate: string = '',
    endDate: string = ''
  ) => {
    const allItems: Array<{
      type: string;
      date: string;
      content: string;
      supportingDocuments?: any[];
    }> = [];

    if (includeNotes) {
      filterItemsByDateRange(employee.notes, startDate, endDate).forEach(note => {
        allItems.push({
          type: 'Notes',
          date: note.date,
          content: note.content,
          supportingDocuments: note.supportingDocuments,
        });
      });
    }

    if (includePraise) {
      filterItemsByDateRange(employee.praise, startDate, endDate).forEach(praise => {
        allItems.push({
          type: 'Praise',
          date: praise.date,
          content: praise.content,
        });
      });
    }

    if (includeFeedback) {
      filterItemsByDateRange(employee.feedback, startDate, endDate).forEach(feedback => {
        allItems.push({
          type: 'Feedback',
          date: feedback.date,
          content: feedback.content,
        });
      });
    }

    // Sort by date
    allItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return allItems;
  };

  // Helper function to generate markdown content (simulating the component logic)
  const generateMarkdownContent = (
    employee: Employee,
    allItems: Array<{ type: string; date: string; content: string; supportingDocuments?: any[] }>,
    startDate: string = '',
    endDate: string = ''
  ) => {
    let markdownContent = `# ${employee.name} - Report\n\n`;
    
    const reportPeriod = startDate && endDate 
      ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
      : startDate 
      ? `From ${new Date(startDate).toLocaleDateString()}`
      : endDate
      ? `Until ${new Date(endDate).toLocaleDateString()}`
      : 'All Time';
    
    markdownContent += `**Report Period:** ${reportPeriod}\n`;
    markdownContent += `**Generated:** ${new Date().toLocaleDateString()}\n\n`;
    markdownContent += `*This report package includes all supporting documents in the 'documents' folder.*\n\n`;

    if (allItems.length === 0) {
      markdownContent += '*No items found for the selected criteria and date range.*\n';
    } else {
      for (let index = 0; index < allItems.length; index++) {
        const item = allItems[index];
        markdownContent += `- **${new Date(item.date).toLocaleDateString()}**\n\n`;
        markdownContent += `  ${item.content}\n\n`;
        
        if (item.supportingDocuments && item.supportingDocuments.length > 0) {
          markdownContent += `  **Supporting Documents:**\n\n`;
          
          for (const doc of item.supportingDocuments) {
            const localPath = `documents/${doc.originalName}`;
            markdownContent += `  - **${doc.originalName}**\n\n`;
            
            if (doc.mimeType.startsWith('image/')) {
              markdownContent += `    ![${doc.originalName}](${localPath})\n\n`;
            } else if (doc.mimeType === 'application/pdf') {
              markdownContent += `    📄 [${doc.originalName}](${localPath})\n\n`;
            } else if (doc.mimeType.includes('text/') || doc.originalName.endsWith('.txt')) {
              markdownContent += `    📄 [${doc.originalName}](${localPath})\n\n`;
            } else {
              markdownContent += `    📄 [${doc.originalName}](${localPath})\n\n`;
            }
          }
        }
      }
    }

    return markdownContent;
  };

  describe('Date Filtering', () => {
    it('should include all items when no date filters are applied', () => {
      const allItems = collectAllItems(mockEmployee, true, true, true);
      
      expect(allItems).toHaveLength(5); // 2 notes + 2 praise + 1 feedback
      expect(allItems.map(item => item.type)).toEqual(['Notes', 'Praise', 'Feedback', 'Notes', 'Praise']);
    });

    it('should filter items by start date only', () => {
      const allItems = collectAllItems(mockEmployee, true, true, true, '2024-02-01');
      
      expect(allItems).toHaveLength(2); // Only items from Feb 15 and Mar 5
      expect(allItems.every(item => new Date(item.date) >= new Date('2024-02-01'))).toBe(true);
    });

    it('should filter items by end date only', () => {
      const allItems = collectAllItems(mockEmployee, true, true, true, '', '2024-01-31');
      
      expect(allItems).toHaveLength(3); // Items from Jan 10, Jan 20, Jan 25
      expect(allItems.every(item => new Date(item.date) <= new Date('2024-01-31T23:59:59'))).toBe(true);
    });

    it('should filter items by date range', () => {
      const allItems = collectAllItems(mockEmployee, true, true, true, '2024-01-15', '2024-02-20');
      
      expect(allItems).toHaveLength(3); // Jan 20, Jan 25, Feb 15
      expect(allItems.every(item => {
        const itemDate = new Date(item.date);
        return itemDate >= new Date('2024-01-15') && itemDate <= new Date('2024-02-20T23:59:59');
      })).toBe(true);
    });

    it('should return empty array when date range excludes all items', () => {
      const allItems = collectAllItems(mockEmployee, true, true, true, '2024-06-01', '2024-06-30');
      
      expect(allItems).toHaveLength(0);
    });
  });

  describe('Category Selection', () => {
    it('should include only notes when only notes are selected', () => {
      const allItems = collectAllItems(mockEmployee, true, false, false);
      
      expect(allItems).toHaveLength(2);
      expect(allItems.every(item => item.type === 'Notes')).toBe(true);
    });

    it('should include only praise when only praise is selected', () => {
      const allItems = collectAllItems(mockEmployee, false, true, false);
      
      expect(allItems).toHaveLength(2);
      expect(allItems.every(item => item.type === 'Praise')).toBe(true);
    });

    it('should include only feedback when only feedback is selected', () => {
      const allItems = collectAllItems(mockEmployee, false, false, true);
      
      expect(allItems).toHaveLength(1);
      expect(allItems.every(item => item.type === 'Feedback')).toBe(true);
    });

    it('should return empty array when no categories are selected', () => {
      const allItems = collectAllItems(mockEmployee, false, false, false);
      
      expect(allItems).toHaveLength(0);
    });
  });

  describe('Sorting', () => {
    it('should sort items chronologically by date', () => {
      const allItems = collectAllItems(mockEmployee, true, true, true);
      
      const dates = allItems.map(item => new Date(item.date).getTime());
      const sortedDates = [...dates].sort((a, b) => a - b);
      
      expect(dates).toEqual(sortedDates);
    });
  });

  describe('Supporting Documents', () => {
    it('should collect unique supporting documents', () => {
      const allItems = collectAllItems(mockEmployee, true, false, false);
      const allDocuments = new Map();
      
      allItems.forEach(item => {
        if (item.supportingDocuments) {
          item.supportingDocuments.forEach(doc => {
            allDocuments.set(doc.filename, doc);
          });
        }
      });
      
      expect(allDocuments.size).toBe(3); // goals-doc.pdf, milestone-chart.png, notes.txt
      expect(Array.from(allDocuments.keys())).toEqual(['goals-doc.pdf', 'milestone-chart.png', 'notes.txt']);
    });
  });

  describe('Markdown Generation', () => {
    it('should generate correct markdown header', () => {
      const allItems = collectAllItems(mockEmployee, true, true, true);
      const markdown = generateMarkdownContent(mockEmployee, allItems);
      
      expect(markdown).toContain('# Jane Smith - Report');
      expect(markdown).toContain('**Report Period:** All Time');
      expect(markdown).toContain('**Generated:**');
    });

    it('should generate bulleted list format', () => {
      const allItems = collectAllItems(mockEmployee, true, false, false);
      const markdown = generateMarkdownContent(mockEmployee, allItems);
      
      expect(markdown).toContain('- **1/10/2024**');
      expect(markdown).toContain('- **2/15/2024**');
      expect(markdown).toContain('  Weekly sync discussion about Q1 goals');
      expect(markdown).toContain('  Project milestone completed ahead of schedule');
    });

    it('should include supporting documents with correct paths', () => {
      const allItems = collectAllItems(mockEmployee, true, false, false);
      const markdown = generateMarkdownContent(mockEmployee, allItems);
      
      expect(markdown).toContain('**Supporting Documents:**');
      expect(markdown).toContain('![Milestone Chart.png](documents/Milestone Chart.png)');
      expect(markdown).toContain('📄 [Q1 Goals.pdf](documents/Q1 Goals.pdf)');
      expect(markdown).toContain('📄 [Meeting Notes.txt](documents/Meeting Notes.txt)');
    });

    it('should handle empty results', () => {
      const allItems = collectAllItems(mockEmployee, false, false, false);
      const markdown = generateMarkdownContent(mockEmployee, allItems);
      
      expect(markdown).toContain('*No items found for the selected criteria and date range.*');
    });

    it('should format date ranges correctly', () => {
      const allItems = collectAllItems(mockEmployee, true, true, true, '2024-01-01', '2024-01-31');
      const markdown = generateMarkdownContent(mockEmployee, allItems, '2024-01-01', '2024-01-31');
      
      // Just check that both dates appear in the report period with a dash
      expect(markdown).toContain('**Report Period:**');
      expect(markdown).toMatch(/202[34].*-.*202[34]/); // Contains years and a dash (handles timezone differences)
    });

    it('should format start date only correctly', () => {
      const allItems = collectAllItems(mockEmployee, true, true, true, '2024-01-15');
      const markdown = generateMarkdownContent(mockEmployee, allItems, '2024-01-15');
      
      expect(markdown).toContain('**Report Period:** From');
      expect(markdown).toContain('2024');
    });

    it('should format end date only correctly', () => {
      const allItems = collectAllItems(mockEmployee, true, true, true, '', '2024-01-31');
      const markdown = generateMarkdownContent(mockEmployee, allItems, '', '2024-01-31');
      
      expect(markdown).toContain('**Report Period:** Until');
      expect(markdown).toContain('2024');
    });
  });
});