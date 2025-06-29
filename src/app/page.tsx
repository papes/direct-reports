import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Employee Notes Tracker
          </h1>
          <p className="text-gray-600">
            Track notes, feedback, and praise from weekly sync meetings
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/employees/new"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-2 border-dashed border-gray-300 hover:border-blue-500"
          >
            <div className="text-center">
              <div className="text-4xl text-gray-400 mb-4">+</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Add New Employee
              </h3>
              <p className="text-gray-600 text-sm">
                Create a new employee profile to start tracking notes
              </p>
            </div>
          </Link>

          <Link
            href="/employees"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="text-center">
              <div className="text-4xl text-blue-500 mb-4">👥</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                View All Employees
              </h3>
              <p className="text-gray-600 text-sm">
                Browse and manage existing employee records
              </p>
            </div>
          </Link>

          <Link
            href="/import-export"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="text-center">
              <div className="text-4xl text-green-500 mb-4">📁</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Import/Export
              </h3>
              <p className="text-gray-600 text-sm">
                Backup or restore your employee data
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
