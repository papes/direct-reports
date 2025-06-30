export interface SupportingDocument {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  mimeType: string;
  size: number;
  checksum?: string; // SHA256 hash for integrity validation
}

export interface EmployeeNote {
  id: string;
  date: string;
  content: string;
  supportingDocuments?: SupportingDocument[];
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
  performanceReviews: SupportingDocument[];
}

export interface EmployeeDatabase {
  employees: Employee[];
  lastUpdated: string;
}