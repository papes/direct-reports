'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Employee } from '@/types/employee';

export default function EmployeeDetailPage() {
  const params = useParams();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notes' | 'praise' | 'feedback'>('notes');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchEmployee();
  }, [params.id]);

  const fetchEmployee = async () => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/employees/${params.id}/${activeTab}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newContent }),
      });

      if (response.ok) {
        setNewContent('');
        await fetchEmployee();
      } else {
        alert(`Failed to add ${activeTab}`);
      }
    } catch (error) {
      console.error(`Error adding ${activeTab}:`, error);
      alert(`Failed to add ${activeTab}`);
    } finally {
      setIsSubmitting(false);
    }
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

  const getTabContent = () => {
    switch (activeTab) {
      case 'notes':
        return employee.notes;
      case 'praise':
        return employee.praise;
      case 'feedback':
        return employee.feedback;
      default:
        return [];
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

        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {employee.name}
          </h1>
          <p className="text-gray-600">
            Start Date: {new Date(employee.startDate).toLocaleDateString()}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-8 pt-6">
              {(['notes', 'praise', 'feedback'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab} ({getTabContent().length})
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="mb-8">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Enter ${activeTab} here...`}
              />
              <button
                type="submit"
                disabled={isSubmitting || !newContent.trim()}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Adding...' : `Add ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
              </button>
            </form>

            <div className="space-y-4">
              {getTabContent().length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No {activeTab} recorded yet.
                </p>
              ) : (
                getTabContent().map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-2">
                      {new Date(item.date).toLocaleDateString()} at{' '}
                      {new Date(item.date).toLocaleTimeString()}
                    </div>
                    <div className="text-gray-900 whitespace-pre-wrap">
                      {item.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}