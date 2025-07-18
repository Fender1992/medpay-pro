import crypto from 'crypto';

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  tag: string;
}

export interface DecryptionInput {
  encryptedData: string;
  iv: string;
  tag: string;
}

class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits

  private getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    
    // Derive key from environment variable
    return crypto.pbkdf2Sync(key, 'medchat-salt', 100000, this.keyLength, 'sha256');
  }

  private generateIV(): Buffer {
    return crypto.randomBytes(this.ivLength);
  }

  /**
   * Encrypt sensitive data (PHI) using AES-256-GCM
   */
  encryptPHI(data: string): EncryptionResult {
    try {
      const key = this.getEncryptionKey();
      const iv = this.generateIV();
      const cipher = crypto.createCipher(this.algorithm, key);
      cipher.setAAD(Buffer.from('PHI-DATA'));

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();

      return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error}`);
    }
  }

  /**
   * Decrypt PHI data
   */
  decryptPHI(input: DecryptionInput): string {
    try {
      const key = this.getEncryptionKey();
      const decipher = crypto.createDecipher(this.algorithm, key);
      
      decipher.setAAD(Buffer.from('PHI-DATA'));
      decipher.setAuthTag(Buffer.from(input.tag, 'hex'));

      let decrypted = decipher.update(input.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error}`);
    }
  }

  /**
   * Hash sensitive data for indexing/searching without exposing PHI
   */
  hashForIndex(data: string): string {
    const key = this.getEncryptionKey();
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Encrypt object with PHI data
   */
  encryptObject(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && this.isPHIField(key)) {
        result[key] = this.encryptPHI(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.encryptObject(value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Decrypt object with PHI data
   */
  decryptObject(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && this.isPHIField(key)) {
        // Check if it's an encrypted object
        if (value.encryptedData && value.iv && value.tag) {
          result[key] = this.decryptPHI(value as DecryptionInput);
        } else {
          result[key] = this.decryptObject(value);
        }
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.decryptObject(value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Check if field contains PHI based on field name
   */
  private isPHIField(fieldName: string): boolean {
    const phiFields = [
      'name', 'email', 'phone', 'address', 'ssn', 'dob', 'date_of_birth',
      'medical_record_number', 'patient_id', 'diagnosis', 'treatment',
      'medication', 'lab_result', 'notes', 'comments', 'message', 'response'
    ];
    
    return phiFields.some(field => 
      fieldName.toLowerCase().includes(field) || 
      fieldName.toLowerCase().includes('patient') ||
      fieldName.toLowerCase().includes('health')
    );
  }

  /**
   * Validate encryption key strength
   */
  validateKeyStrength(key: string): boolean {
    // Check minimum length
    if (key.length < 32) return false;
    
    // Check for variety of characters
    const hasUpper = /[A-Z]/.test(key);
    const hasLower = /[a-z]/.test(key);
    const hasNumber = /[0-9]/.test(key);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(key);
    
    return hasUpper && hasLower && hasNumber && hasSpecial;
  }
}

export const encryptionService = new EncryptionService();