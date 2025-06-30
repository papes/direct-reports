'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Employee } from '@/types/employee';

export default function Home() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalEntries = (employee: Employee) => {
    return employee.notes.length + employee.praise.length + employee.feedback.length;
  };

  const getLatestEntry = (employee: Employee) => {
    const allEntries = [
      ...employee.notes.map(n => ({ ...n, type: 'note' })),
      ...employee.praise.map(p => ({ ...p, type: 'praise' })),
      ...employee.feedback.map(f => ({ ...f, type: 'feedback' }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return allEntries[0] || null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="text-gray-600">Loading employees...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Direct Reports Tracker
            </h1>
            <p className="text-lg text-gray-600">
              Track notes, feedback, and praise from weekly sync meetings
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/import-export"
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
              Import/Export
            </Link>
            <Link
              href="/employees/new"
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Employee
            </Link>
          </div>
        </div>

        {employees.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              No employees yet
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Get started by adding your first employee to begin tracking notes, feedback, and praise.
            </p>
            <Link
              href="/employees/new"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add First Employee
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.map((employee) => {
              const totalEntries = getTotalEntries(employee);
              const latestEntry = getLatestEntry(employee);
              
              return (
                <Link
                  key={employee.id}
                  href={`/employees/${employee.id}`}
                  className="group bg-white rounded-xl shadow-sm p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {employee.name}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Started: {new Date(employee.startDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="text-gray-600">Notes:</span>
                      <span className="font-medium">{employee.notes.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="text-gray-600">Praise:</span>
                      <span className="font-medium">{employee.praise.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mb-3">
                      <span className="text-gray-600">Feedback:</span>
                      <span className="font-medium">{employee.feedback.length}</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span className="text-gray-700">Total Entries:</span>
                        <span className="text-blue-600">{totalEntries}</span>
                      </div>
                    </div>
                  </div>

                  {latestEntry && (
                    <div className="border-t pt-4">
                      <p className="text-xs text-gray-500 mb-2">
                        Latest {latestEntry.type}:
                      </p>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {latestEntry.content}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(latestEntry.date).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {totalEntries === 0 && (
                    <div className="border-t pt-4 text-center">
                      <p className="text-gray-500 text-sm">
                        No entries yet
                      </p>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
