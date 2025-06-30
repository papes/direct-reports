'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ImportExportPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMessage, setImportMessage] = useState<string>('');

  const handleExport = async (format: 'json' | 'zip') => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/import-export/export?format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const fileExt = format === 'zip' ? 'zip' : 'json';
        a.download = `employee-data-${new Date().toISOString().split('T')[0]}.${fileExt}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to export data');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'application/json' || file.type === 'application/zip' || file.name.endsWith('.json') || file.name.endsWith('.zip'))) {
      setImportFile(file);
      setImportMessage('');
    } else {
      setImportFile(null);
      setImportMessage('Please select a valid JSON or ZIP file');
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setIsImporting(true);
    setImportMessage('');

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch('/api/import-export/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setImportMessage(`Successfully imported data! ${result.message || ''}`);
        setImportFile(null);
        // Reset file input
        const fileInput = document.getElementById('import-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setImportMessage(`Import failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportMessage('Import failed: Network error');
    } finally {
      setIsImporting(false);
    }
  };

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

        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Import & Export Data
          </h1>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Export Section */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Export Data
              </h2>
              <p className="text-gray-600 mb-6">
                Download all employee data in your preferred format.
              </p>
              
              {/* ZIP Export - Recommended */}
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center mb-2">
                  <span className="text-green-800 font-medium">📦 ZIP Archive (Recommended)</span>
                  <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Complete</span>
                </div>
                <p className="text-green-700 text-sm mb-3">
                  Includes all data AND supporting documents. Perfect for transferring between machines.
                </p>
                <button
                  onClick={() => handleExport('zip')}
                  disabled={isExporting}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? 'Exporting...' : 'Download ZIP Archive'}
                </button>
              </div>

              {/* JSON Export - Legacy */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-center mb-2">
                  <span className="text-amber-800 font-medium">📄 JSON Only</span>
                  <span className="ml-2 px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded-full">Legacy</span>
                </div>
                <p className="text-amber-700 text-sm mb-3">
                  Data only - supporting documents NOT included. May have broken links on other machines.
                </p>
                <button
                  onClick={() => handleExport('json')}
                  disabled={isExporting}
                  className="w-full bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? 'Exporting...' : 'Download JSON Only'}
                </button>
              </div>
            </div>

            {/* Import Section */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Import Data
              </h2>
              <p className="text-gray-600 mb-4">
                Upload a ZIP archive or JSON file to replace all existing employee data.
              </p>
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-yellow-800 text-sm">
                  <strong>Warning:</strong> This will replace all existing data.
                </p>
              </div>

              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-blue-800 text-sm">
                  <strong>💡 Tip:</strong> ZIP archives include supporting documents and work perfectly across different machines. JSON files only contain data references.
                </p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="import-file" className="block text-sm font-medium text-gray-700 mb-2">
                  Select ZIP Archive or JSON File
                </label>
                <input
                  type="file"
                  id="import-file"
                  accept=".json,.zip,application/json,application/zip"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {importFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {importFile.name} ({importFile.type || 'unknown type'})
                    {importFile.name.endsWith('.zip') && (
                      <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Will import documents
                      </span>
                    )}
                  </p>
                )}
              </div>

              {importMessage && (
                <div className={`mb-4 p-3 rounded-md ${
                  importMessage.includes('Successfully') 
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  {importMessage}
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={!importFile || isImporting}
                className="w-full bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? 'Importing...' : 'Import & Replace Data'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}