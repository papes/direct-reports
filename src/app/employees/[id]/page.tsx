'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Employee, EmployeeNote, EmployeePraise, EmployeeFeedback, SupportingDocument } from '@/types/employee';
import ReportDialog from '@/components/ReportDialog';

export default function EmployeeDetailPage() {
  const params = useParams();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notes' | 'praise' | 'feedback' | 'performance-reviews'>('notes');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  const fetchEmployee = useCallback(async () => {
    try {
      const response = await fetch(`/api/employees/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setEmployee(data);
      }
    } catch (error) {
      console.error('Error fetching employee:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  const getTabContent = useCallback(() => {
    if (!employee) return [];
    switch (activeTab) {
      case 'notes':
        return employee.notes;
      case 'praise':
        return employee.praise;
      case 'feedback':
        return employee.feedback;
      case 'performance-reviews':
        return (employee.performanceReviews || []).map(doc => ({
          id: doc.id,
          date: new Date().toISOString(), // Performance reviews don't have dates, use current
          content: doc.originalName,
          document: doc
        }));
      default:
        return [];
    }
  }, [employee, activeTab]);

  const getTabCount = useCallback((tab: 'notes' | 'praise' | 'feedback' | 'performance-reviews') => {
    if (!employee) return 0;
    switch (tab) {
      case 'notes':
        return employee.notes.length;
      case 'praise':
        return employee.praise.length;
      case 'feedback':
        return employee.feedback.length;
      case 'performance-reviews':
        return (employee.performanceReviews || []).length;
      default:
        return 0;
    }
  }, [employee]);

  const filteredContent = useMemo(() => {
    const content = getTabContent();
    if (!searchTerm.trim()) return content;
    
    return content.filter(item => 
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      new Date(item.date).toLocaleDateString().includes(searchTerm)
    );
  }, [getTabContent, searchTerm]);

  const paginatedContent = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredContent.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredContent, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredContent.length / itemsPerPage);

  const handleTabChange = (tab: 'notes' | 'praise' | 'feedback' | 'performance-reviews') => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchTerm('');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    try {
      if (activeTab === 'performance-reviews') {
        // Handle performance review file upload
        if (selectedFiles.length === 0) {
          alert('Please select a PDF file for the performance review.');
          return;
        }
        
        const file = selectedFiles[0];
        if (!file.type.includes('pdf')) {
          alert('Performance reviews must be PDF files.');
          return;
        }
        
        // Upload the file using the file upload endpoint with fake note content
        const formData = new FormData();
        formData.append('content', 'Performance Review'); // Fake content to satisfy the notes API
        formData.append('date', selectedDate);
        formData.append('files', file);
        
        // Upload file and get document metadata
        const uploadResponse = await fetch(`/api/employees/${params.id}/notes`, {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          alert('Failed to upload performance review file');
          return;
        }
        
        const noteResult = await uploadResponse.json();
        if (noteResult.supportingDocuments && noteResult.supportingDocuments.length > 0) {
          const document = noteResult.supportingDocuments[0];
          
          // Add to performance reviews and remove from notes
          const reviewResponse = await fetch(`/api/employees/${params.id}/performance-reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ document }),
          });
          
          if (reviewResponse.ok) {
            setSelectedFiles([]);
            await fetchEmployee();
          } else {
            alert('Failed to add performance review');
          }
        }
      } else {
        // Handle other tabs (notes, praise, feedback)
        if (!newContent.trim()) return;
        
        const formData = new FormData();
        formData.append('content', newContent);
        formData.append('date', selectedDate);
        
        // Add files only for notes tab
        if (activeTab === 'notes') {
          selectedFiles.forEach(file => {
            formData.append('files', file);
          });
        }

        const response = await fetch(`/api/employees/${params.id}/${activeTab}`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          setNewContent('');
          setSelectedFiles([]);
          await fetchEmployee();
        } else {
          alert(`Failed to add ${activeTab}`);
        }
      }
    } catch (error) {
      console.error(`Error adding ${activeTab}:`, error);
      alert(`Failed to add ${activeTab}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (activeTab === 'performance-reviews') {
      // Only allow PDF files for performance reviews
      const validFiles = files.filter(file => file.type.includes('pdf'));
      
      if (validFiles.length !== files.length) {
        alert('Performance reviews must be PDF files only.');
      }
      
      setSelectedFiles(validFiles.slice(0, 1)); // Only allow one file for performance reviews
    } else {
      // Allow multiple file types for notes
      const allowedTypes = ['.doc', '.docx', '.pdf', '.png', '.jpg', '.jpeg'];
      const validFiles = files.filter(file => {
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        return allowedTypes.includes(extension);
      });
      
      if (validFiles.length !== files.length) {
        alert('Some files were not added. Only .doc, .docx, .pdf, .png, .jpg, .jpeg files are allowed.');
      }
      
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const isNoteWithDocuments = (item: EmployeeNote | EmployeePraise | EmployeeFeedback): item is EmployeeNote => {
    return activeTab === 'notes' && 'supportingDocuments' in item;
  };

  const isPerformanceReview = (item: EmployeeNote | EmployeePraise | EmployeeFeedback | { id: string; date: string; content: string; document: SupportingDocument }): item is { id: string; date: string; content: string; document: SupportingDocument } => {
    return activeTab === 'performance-reviews' && 'document' in item;
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 py-8 text-center">Loading...</div>;
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Employee not found</h1>
        <Link href="/" className="text-blue-600 hover:text-blue-800">
          Return to Home
        </Link>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Home
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {employee.name}
              </h1>
              <p className="text-gray-600">
                Start Date: {new Date(employee.startDate).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => setIsReportDialogOpen(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Generate Report
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-8 pt-6">
              {(['notes', 'praise', 'feedback', 'performance-reviews'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab === 'performance-reviews' ? 'Performance Reviews' : tab.charAt(0).toUpperCase() + tab.slice(1)} ({getTabCount(tab)})
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="mb-8">
              {activeTab !== 'performance-reviews' && (
                <>
                  <div className="mb-4">
                    <label
                      htmlFor="date"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Date
                    </label>
                    <input
                      type="date"
                      id="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    />
                  </div>
                  <label
                    htmlFor="content"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Add New {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                  </label>
                  <textarea
                    id="content"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    placeholder={`Enter ${activeTab} here...`}
                  />
                </>
              )}
              
              {(activeTab === 'notes' || activeTab === 'performance-reviews') && (
                <div className="mt-4">
                  <label
                    htmlFor="files"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {activeTab === 'performance-reviews' ? 'Performance Review PDF' : 'Supporting Documents (optional)'}
                  </label>
                  <input
                    type="file"
                    id="files"
                    multiple={activeTab !== 'performance-reviews'}
                    accept={activeTab === 'performance-reviews' ? '.pdf' : '.doc,.docx,.pdf,.png,.jpg,.jpeg'}
                    onChange={handleFileChange}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {activeTab === 'performance-reviews' 
                      ? 'Only PDF files are allowed for performance reviews'
                      : 'Allowed formats: .doc, .docx, .pdf, .png, .jpg, .jpeg'
                    }
                  </p>
                  
                  {selectedFiles.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Selected files:</p>
                      <div className="space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                            <span className="text-sm text-gray-700 truncate">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-red-600 hover:text-red-800 text-sm ml-2"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <button
                type="submit"
                disabled={isSubmitting || (activeTab !== 'performance-reviews' && !newContent.trim()) || (activeTab === 'performance-reviews' && selectedFiles.length === 0)}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Adding...' : (activeTab === 'performance-reviews' ? 'Upload Performance Review' : `Add ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`)}
              </button>
            </form>

            <div className="border-t border-gray-200 pt-6 mt-8">
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="flex-1 max-w-md">
                    <input
                      type="text"
                      placeholder={`Search ${activeTab}...`}
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    />
                  </div>
                  <div className="text-sm text-gray-500">
                    Showing {paginatedContent.length} of {filteredContent.length} {activeTab}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {filteredContent.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {searchTerm ? `No ${activeTab === 'performance-reviews' ? 'performance reviews' : activeTab} found matching "${searchTerm}"` : `No ${activeTab === 'performance-reviews' ? 'performance reviews' : activeTab} recorded yet.`}
                </p>
              ) : (
                paginatedContent.map((item: EmployeeNote | EmployeePraise | EmployeeFeedback | { id: string; date: string; content: string; document: SupportingDocument }) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    {isPerformanceReview(item) ? (
                      // Performance review display
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <a
                            href={item.document.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-lg font-medium underline"
                          >
                            {item.document.originalName}
                          </a>
                          <div className="text-sm text-gray-500 mt-1">
                            PDF Document • {(item.document.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          📄 Performance Review
                        </div>
                      </div>
                    ) : (
                      // Regular content display for notes, praise, feedback
                      <>
                        <div className="text-sm text-gray-500 mb-2">
                          {new Date(item.date).toLocaleDateString()} at{' '}
                          {new Date(item.date).toLocaleTimeString()}
                        </div>
                        <div className="text-gray-900 whitespace-pre-wrap mb-3">
                          {item.content}
                        </div>
                        {isNoteWithDocuments(item) && item.supportingDocuments && item.supportingDocuments.length > 0 ? (
                          <div className="border-t border-gray-100 pt-3">
                            <p className="text-sm font-medium text-gray-700 mb-2">Supporting Documents:</p>
                            <div className="space-y-2">
                              {item.supportingDocuments.map((doc) => (
                                <div key={doc.id} className="flex items-center space-x-2">
                                  <a
                                    href={doc.path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 text-sm underline"
                                  >
                                    {doc.originalName}
                                  </a>
                                  <span className="text-gray-500 text-xs">
                                    ({(doc.size / 1024).toFixed(1)} KB)
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex justify-center items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Report Dialog */}
      <ReportDialog
        isOpen={isReportDialogOpen}
        onClose={() => setIsReportDialogOpen(false)}
        employee={employee}
      />
    </div>
  );
}