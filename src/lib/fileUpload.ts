import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SupportingDocument } from '@/types/employee';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'resources');
const ALLOWED_EXTENSIONS = ['.doc', '.docx', '.pdf', '.png', '.jpg', '.jpeg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export class FileUploadService {
  private static async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(UPLOAD_DIR);
    } catch {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
    }
  }

  static async uploadFile(
    file: File,
    employeeName: string,
    entryDate: string
  ): Promise<SupportingDocument> {
    await this.ensureUploadDir();

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    // Validate file extension
    const originalExt = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(originalExt)) {
      throw new Error(`File type ${originalExt} is not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`);
    }

    // Generate filename: supporting-doc-{employee name}-{date of entry}-{new uuid}.{extension}
    const sanitizedEmployeeName = employeeName.replace(/[^a-zA-Z0-9]/g, '-');
    const formattedDate = new Date(entryDate).toISOString().split('T')[0];
    const fileId = uuidv4();
    const filename = `supporting-doc-${sanitizedEmployeeName}-${formattedDate}-${fileId}${originalExt}`;
    
    const filepath = path.join(UPLOAD_DIR, filename);

    // Convert File to Buffer and save
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filepath, buffer);

    const supportingDocument: SupportingDocument = {
      id: fileId,
      filename,
      originalName: file.name,
      path: `/api/files/${filename}`,
      mimeType: file.type,
      size: file.size
    };

    return supportingDocument;
  }

  static async deleteFile(filename: string): Promise<void> {
    const filepath = path.join(UPLOAD_DIR, filename);
    try {
      await fs.unlink(filepath);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }

  static isValidFileType(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return ALLOWED_EXTENSIONS.includes(ext);
  }
}