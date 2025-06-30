'use client';

import { useState } from 'react';
import { Employee, SupportingDocument } from '@/types/employee';
import JSZip from 'jszip';

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
}

export default function ReportDialog({ isOpen, onClose, employee }: ReportDialogProps) {
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includePraise, setIncludePraise] = useState(true);
  const [includeFeedback, setIncludeFeedback] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReport = async () => {
    setIsGenerating(true);
    
    try {
      // Create a new zip file
      const zip = new JSZip();
      const documentsFolder = zip.folder('documents');
      
      // Collect all items within date range
      const allItems: Array<{
        type: string;
        date: string;
        content: string;
        supportingDocuments?: SupportingDocument[];
      }> = [];

      const startDateTime = startDate ? new Date(startDate).getTime() : 0;
      const endDateTime = endDate ? new Date(endDate + 'T23:59:59').getTime() : Date.now();

      // Add notes if enabled
      if (includeNotes) {
        employee.notes
          .filter(item => {
            const itemTime = new Date(item.date).getTime();
            return itemTime >= startDateTime && itemTime <= endDateTime;
          })
          .forEach(note => {
            allItems.push({
              type: 'Notes',
              date: note.date,
              content: note.content,
              supportingDocuments: note.supportingDocuments
            });
          });
      }

      // Add praise if enabled
      if (includePraise) {
        employee.praise
          .filter(item => {
            const itemTime = new Date(item.date).getTime();
            return itemTime >= startDateTime && itemTime <= endDateTime;
          })
          .forEach(praise => {
            allItems.push({
              type: 'Praise',
              date: praise.date,
              content: praise.content
            });
          });
      }

      // Add feedback if enabled
      if (includeFeedback) {
        employee.feedback
          .filter(item => {
            const itemTime = new Date(item.date).getTime();
            return itemTime >= startDateTime && itemTime <= endDateTime;
          })
          .forEach(feedback => {
            allItems.push({
              type: 'Feedback',
              date: feedback.date,
              content: feedback.content
            });
          });
      }

      // Sort by date
      allItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Collect all unique supporting documents
      const allDocuments = new Map<string, SupportingDocument>();
      allItems.forEach(item => {
        if (item.supportingDocuments) {
          item.supportingDocuments.forEach(doc => {
            allDocuments.set(doc.filename, doc);
          });
        }
      });

      // Download and add all supporting documents to zip
      for (const [, doc] of allDocuments) {
        try {
          const fileUrl = `${window.location.origin}/api/files/${doc.filename}`;
          console.log(`Downloading file: ${doc.originalName} from ${fileUrl}`);
          const response = await fetch(fileUrl);
          if (response.ok) {
            const fileContent = await response.arrayBuffer();
            documentsFolder?.file(doc.originalName, fileContent);
            console.log(`Successfully added to zip: documents/${doc.originalName}`);
          } else {
            console.warn(`Failed to download ${doc.originalName}: HTTP ${response.status}`);
          }
        } catch (error) {
          console.warn(`Failed to fetch file ${doc.originalName}:`, error);
        }
      }

      // Generate markdown content with local file references
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
      
      // Add debugging info about files included
      if (allDocuments.size > 0) {
        markdownContent += `**Files included in this package:**\n`;
        for (const [, doc] of allDocuments) {
          markdownContent += `- documents/${doc.originalName}\n`;
        }
        markdownContent += '\n';
      }

      if (allItems.length === 0) {
        markdownContent += '*No items found for the selected criteria and date range.*\n';
      } else {
        for (let index = 0; index < allItems.length; index++) {
          const item = allItems[index];
          markdownContent += `- **${new Date(item.date).toLocaleDateString()}**\n\n`;
          markdownContent += `  ${item.content}\n\n`;
          
          // Add supporting documents if they exist
          if (item.supportingDocuments && item.supportingDocuments.length > 0) {
            markdownContent += `  **Supporting Documents:**\n\n`;
            
            for (const doc of item.supportingDocuments) {
              const localPath = `documents/${doc.originalName}`;
              markdownContent += `  - **${doc.originalName}**\n\n`;
              
              // Handle different file types with local references
              if (doc.mimeType.startsWith('image/')) {
                // Reference local image file
                markdownContent += `    ![${doc.originalName}](${localPath})\n\n`;
              } else if (doc.mimeType === 'application/pdf') {
                // Reference local PDF file
                markdownContent += `    📄 [${doc.originalName}](${localPath})\n\n`;
              } else if (doc.mimeType.includes('text/') || doc.originalName.endsWith('.txt')) {
                // For text files, try to fetch and embed content, plus provide local reference
                try {
                  const fileUrl = `${window.location.origin}/api/files/${doc.filename}`;
                  const response = await fetch(fileUrl);
                  if (response.ok) {
                    const textContent = await response.text();
                    markdownContent += `    \`\`\`\n    ${textContent.replace(/\n/g, '\n    ')}\n    \`\`\`\n\n`;
                    markdownContent += `    *Full file: [${doc.originalName}](${localPath})*\n\n`;
                  } else {
                    markdownContent += `    📄 [${doc.originalName}](${localPath})\n\n`;
                  }
                } catch {
                  markdownContent += `    📄 [${doc.originalName}](${localPath})\n\n`;
                }
              } else if (doc.originalName.endsWith('.docx') || doc.originalName.endsWith('.doc')) {
                // Reference local Word document
                markdownContent += `    📝 [${doc.originalName}](${localPath})\n\n`;
              } else {
                // Reference local file
                markdownContent += `    📄 [${doc.originalName}](${localPath})\n\n`;
              }
            }
          }
        }
      }

      // Add the markdown report to the zip
      zip.file('report.md', markdownContent);

      // Add a README file explaining the structure
      const readmeContent = `# ${employee.name} - Report Package\n\n` +
        `This package contains:\n\n` +
        `- **report.md** - The main report in Markdown format\n` +
        `- **documents/** - Folder containing all supporting documents referenced in the report\n\n` +
        `## File Structure\n\n` +
        `\`\`\`\n` +
        `${employee.name.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.zip\n` +
        `├── report.md\n` +
        `├── README.md\n` +
        `└── documents/\n` +
        `    ├── file1.pdf\n` +
        `    ├── image.png\n` +
        `    └── ...\n` +
        `\`\`\`\n\n` +
        `## Viewing the Report\n\n` +
        `1. **Extract the zip file** to a folder on your computer\n` +
        `2. **Open 'report.md'** in any Markdown viewer or text editor\n` +
        `3. All file references use relative paths: \`documents/filename.ext\`\n` +
        `4. For best results, use a Markdown viewer that supports local file links\n\n` +
        `## Converting to PDF\n\n` +
        `You can convert the Markdown report to PDF using:\n` +
        `- **Visual Studio Code** with "Markdown PDF" extension\n` +
        `- **Pandoc** command line tool: \`pandoc report.md -o report.pdf\`\n` +
        `- **Online Markdown to PDF** converters\n\n` +
        `## Troubleshooting\n\n` +
        `If images don't display:\n` +
        `1. Ensure the zip file is fully extracted\n` +
        `2. Check that the 'documents' folder is in the same directory as report.md\n` +
        `3. Try opening report.md in different markdown viewers\n\n` +
        `Generated on: ${new Date().toLocaleString()}\n`;
        
      zip.file('README.md', readmeContent);

      // Generate and download the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${employee.name.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Generate Report</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Include in Report:
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(e) => setIncludeNotes(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Notes ({employee.notes.length})</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includePraise}
                  onChange={(e) => setIncludePraise(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Praise ({employee.praise.length})</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeFeedback}
                  onChange={(e) => setIncludeFeedback(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Feedback ({employee.feedback.length})</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date (optional):
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date (optional):
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={generateReport}
            disabled={isGenerating || (!includeNotes && !includePraise && !includeFeedback)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>
    </div>
  );
}