export interface EmployeeNote {
  id: string;
  date: string;
  content: string;
}

export interface EmployeePraise {
  id: string;
  date: string;
  content: string;
}

export interface EmployeeFeedback {
  id: string;
  date: string;
  content: string;
}

export interface Employee {
  id: string;
  name: string;
  startDate: string;
  notes: EmployeeNote[];
  praise: EmployeePraise[];
  feedback: EmployeeFeedback[];
}

export interface EmployeeDatabase {
  employees: Employee[];
  lastUpdated: string;
}