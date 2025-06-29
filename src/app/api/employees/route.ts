import { NextRequest, NextResponse } from 'next/server';
import { EmployeeDB } from '@/lib/database';

export async function GET() {
  try {
    const employees = await EmployeeDB.getAllEmployees();
    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, startDate } = await request.json();
    
    if (!name || !startDate) {
      return NextResponse.json(
        { error: 'Name and start date are required' },
        { status: 400 }
      );
    }

    const employee = await EmployeeDB.createEmployee(name, startDate);
    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}