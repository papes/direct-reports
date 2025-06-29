import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Employee, EmployeeDatabase, EmployeeNote, EmployeePraise, EmployeeFeedback } from '@/types/employee';

const DB_PATH = path.join(process.cwd(), 'data', 'employees.json');

export class EmployeeDB {
  private static async ensureDataDir(): Promise<void> {
    const dataDir = path.dirname(DB_PATH);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  private static async loadDatabase(): Promise<EmployeeDatabase> {
    await this.ensureDataDir();
    
    try {
      const data = await fs.readFile(DB_PATH, 'utf-8');
      return JSON.parse(data);
    } catch {
      const emptyDb: EmployeeDatabase = {
        employees: [],
        lastUpdated: new Date().toISOString()
      };
      await this.saveDatabase(emptyDb);
      return emptyDb;
    }
  }

  private static async saveDatabase(db: EmployeeDatabase): Promise<void> {
    await this.ensureDataDir();
    db.lastUpdated = new Date().toISOString();
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
  }

  static async getAllEmployees(): Promise<Employee[]> {
    const db = await this.loadDatabase();
    return db.employees;
  }

  static async getEmployee(id: string): Promise<Employee | null> {
    const db = await this.loadDatabase();
    return db.employees.find(emp => emp.id === id) || null;
  }

  static async createEmployee(name: string, startDate: string): Promise<Employee> {
    const db = await this.loadDatabase();
    
    const newEmployee: Employee = {
      id: uuidv4(),
      name,
      startDate,
      notes: [],
      praise: [],
      feedback: []
    };

    db.employees.push(newEmployee);
    await this.saveDatabase(db);
    
    return newEmployee;
  }

  static async addNote(employeeId: string, content: string): Promise<EmployeeNote> {
    const db = await this.loadDatabase();
    const employee = db.employees.find(emp => emp.id === employeeId);
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    const note: EmployeeNote = {
      id: uuidv4(),
      date: new Date().toISOString(),
      content
    };

    employee.notes.push(note);
    await this.saveDatabase(db);
    
    return note;
  }

  static async addPraise(employeeId: string, content: string): Promise<EmployeePraise> {
    const db = await this.loadDatabase();
    const employee = db.employees.find(emp => emp.id === employeeId);
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    const praise: EmployeePraise = {
      id: uuidv4(),
      date: new Date().toISOString(),
      content
    };

    employee.praise.push(praise);
    await this.saveDatabase(db);
    
    return praise;
  }

  static async addFeedback(employeeId: string, content: string): Promise<EmployeeFeedback> {
    const db = await this.loadDatabase();
    const employee = db.employees.find(emp => emp.id === employeeId);
    
    if (!employee) {
      throw new Error('Employee not found');
    }

    const feedback: EmployeeFeedback = {
      id: uuidv4(),
      date: new Date().toISOString(),
      content
    };

    employee.feedback.push(feedback);
    await this.saveDatabase(db);
    
    return feedback;
  }

  static async exportToJSON(): Promise<string> {
    const db = await this.loadDatabase();
    return JSON.stringify(db, null, 2);
  }

  static async importFromJSON(jsonData: string): Promise<void> {
    const db: EmployeeDatabase = JSON.parse(jsonData);
    await this.saveDatabase(db);
  }
}