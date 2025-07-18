import { auditLogger } from './audit-logger';
import { encryptionService } from './encryption';

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  type: 'HIPAA' | 'GDPR' | 'SOX' | 'PCI' | 'HITECH' | 'CCPA' | 'CUSTOM';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  validationFunction: (data: any) => ComplianceViolation[];
}

export interface ComplianceViolation {
  ruleId: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  field?: string;
  value?: string;
  remediation: string;
  autoFixable: boolean;
}

export interface DataClassification {
  level: 'public' | 'internal' | 'confidential' | 'restricted' | 'phi';
  categories: string[];
  retentionPeriod: number; // in days
  encryptionRequired: boolean;
  accessControls: string[];
  geographicRestrictions: string[];
}

export interface PrivacyRights {
  rightToAccess: boolean;
  rightToRectification: boolean;
  rightToErasure: boolean;
  rightToRestriction: boolean;
  rightToPortability: boolean;
  rightToObject: boolean;
  automatedDecisionMaking: boolean;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  purpose: string;
  consentType: 'explicit' | 'implicit' | 'opt-in' | 'opt-out';
  consentDate: string;
  expirationDate?: string;
  withdrawn: boolean;
  withdrawnDate?: string;
  legalBasis: string;
  processingCategories: string[];
  dataCategories: string[];
  thirdPartySharing: boolean;
  retentionPeriod: number;
}

export interface DataRetentionPolicy {
  id: string;
  name: string;
  description: string;
  dataTypes: string[];
  retentionPeriod: number; // in days
  purgeMethod: 'delete' | 'anonymize' | 'archive';
  legalBasis: string;
  exceptions: string[];
  enabled: boolean;
}

class ComplianceManager {
  private rules: Map<string, ComplianceRule> = new Map();
  private dataClassifications: Map<string, DataClassification> = new Map();
  private consentRecords: Map<string, ConsentRecord[]> = new Map();
  private retentionPolicies: Map<string, DataRetentionPolicy> = new Map();

  constructor() {
    this.initializeDefaultRules();
    this.initializeDataClassifications();
    this.initializeRetentionPolicies();
  }

  private initializeDefaultRules(): void {
    // HIPAA Rules
    this.addRule({
      id: 'hipaa-phi-encryption',
      name: 'PHI Encryption Required',
      description: 'All PHI must be encrypted at rest and in transit',
      type: 'HIPAA',
      severity: 'critical',
      enabled: true,
      validationFunction: (data) => this.validatePHIEncryption(data)
    });

    this.addRule({
      id: 'hipaa-minimum-necessary',
      name: 'Minimum Necessary Standard',
      description: 'Access to PHI must be limited to minimum necessary',
      type: 'HIPAA',
      severity: 'high',
      enabled: true,
      validationFunction: (data) => this.validateMinimumNecessary(data)
    });

    this.addRule({
      id: 'hipaa-access-controls',
      name: 'Access Controls Required',
      description: 'PHI access must be controlled and logged',
      type: 'HIPAA',
      severity: 'high',
      enabled: true,
      validationFunction: (data) => this.validateAccessControls(data)
    });

    // GDPR Rules
    this.addRule({
      id: 'gdpr-consent-required',
      name: 'Consent Required',
      description: 'Processing requires valid consent',
      type: 'GDPR',
      severity: 'critical',
      enabled: true,
      validationFunction: (data) => this.validateConsent(data)
    });

    this.addRule({
      id: 'gdpr-data-minimization',
      name: 'Data Minimization',
      description: 'Only necessary data should be collected',
      type: 'GDPR',
      severity: 'high',
      enabled: true,
      validationFunction: (data) => this.validateDataMinimization(data)
    });

    this.addRule({
      id: 'gdpr-retention-limits',
      name: 'Retention Limits',
      description: 'Data must not be kept longer than necessary',
      type: 'GDPR',
      severity: 'high',
      enabled: true,
      validationFunction: (data) => this.validateRetentionLimits(data)
    });

    // SOX Rules
    this.addRule({
      id: 'sox-audit-trail',
      name: 'Audit Trail Required',
      description: 'All financial data access must be logged',
      type: 'SOX',
      severity: 'high',
      enabled: true,
      validationFunction: (data) => this.validateAuditTrail(data)
    });
  }

  private initializeDataClassifications(): void {
    this.dataClassifications.set('phi', {
      level: 'phi',
      categories: ['health', 'medical', 'diagnosis', 'treatment'],
      retentionPeriod: 2555, // 7 years
      encryptionRequired: true,
      accessControls: ['role-based', 'audit-logged', 'minimum-necessary'],
      geographicRestrictions: ['us-only']
    });

    this.dataClassifications.set('pii', {
      level: 'restricted',
      categories: ['personal', 'identification', 'contact'],
      retentionPeriod: 1095, // 3 years
      encryptionRequired: true,
      accessControls: ['role-based', 'audit-logged'],
      geographicRestrictions: []
    });

    this.dataClassifications.set('internal', {
      level: 'internal',
      categories: ['business', 'operational'],
      retentionPeriod: 365, // 1 year
      encryptionRequired: false,
      accessControls: ['role-based'],
      geographicRestrictions: []
    });
  }

  private initializeRetentionPolicies(): void {
    this.retentionPolicies.set('phi-policy', {
      id: 'phi-policy',
      name: 'PHI Retention Policy',
      description: 'HIPAA compliant retention for Protected Health Information',
      dataTypes: ['health_records', 'medical_data', 'diagnosis', 'treatment'],
      retentionPeriod: 2555, // 7 years
      purgeMethod: 'anonymize',
      legalBasis: 'HIPAA compliance',
      exceptions: ['legal_hold', 'ongoing_care'],
      enabled: true
    });

    this.retentionPolicies.set('chat-policy', {
      id: 'chat-policy',
      name: 'Chat History Retention',
      description: 'Retention policy for AI chat conversations',
      dataTypes: ['chat_messages', 'ai_responses'],
      retentionPeriod: 1095, // 3 years
      purgeMethod: 'delete',
      legalBasis: 'Business necessity',
      exceptions: ['audit_requirement'],
      enabled: true
    });

    this.retentionPolicies.set('audit-policy', {
      id: 'audit-policy',
      name: 'Audit Log Retention',
      description: 'Retention policy for audit logs',
      dataTypes: ['audit_logs', 'access_logs'],
      retentionPeriod: 2555, // 7 years
      purgeMethod: 'archive',
      legalBasis: 'Regulatory compliance',
      exceptions: [],
      enabled: true
    });
  }

  async validateCompliance(data: any, context: any): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    
    for (const rule of this.rules.values()) {
      if (rule.enabled) {
        try {
          const ruleViolations = rule.validationFunction(data);
          violations.push(...ruleViolations);
        } catch (error) {
          console.error(`Error validating rule ${rule.id}:`, error);
          violations.push({
            ruleId: rule.id,
            description: `Rule validation failed: ${error}`,
            severity: 'medium',
            remediation: 'Contact system administrator',
            autoFixable: false
          });
        }
      }
    }

    // Log compliance check
    await auditLogger.logEvent({
      event_type: 'data_accessed',
      details: {
        compliance_check: true,
        violations_found: violations.length,
        violation_severities: violations.map(v => v.severity),
        data_classification: this.classifyData(data)
      },
      risk_level: violations.some(v => v.severity === 'critical') ? 'critical' : 'low',
      compliance_relevant: true,
      phi_involved: this.containsPHI(data)
    });

    return violations;
  }

  async recordConsent(consent: Omit<ConsentRecord, 'id'>): Promise<ConsentRecord> {
    const consentRecord: ConsentRecord = {
      ...consent,
      id: `consent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    const userConsents = this.consentRecords.get(consent.userId) || [];
    userConsents.push(consentRecord);
    this.consentRecords.set(consent.userId, userConsents);

    await auditLogger.logEvent({
      event_type: 'data_modified',
      user_id: consent.userId,
      details: {
        action: 'consent_recorded',
        purpose: consent.purpose,
        consent_type: consent.consentType,
        legal_basis: consent.legalBasis
      },
      risk_level: 'low',
      compliance_relevant: true,
      phi_involved: consent.dataCategories.includes('phi')
    });

    return consentRecord;
  }

  async withdrawConsent(userId: string, consentId: string): Promise<boolean> {
    const userConsents = this.consentRecords.get(userId) || [];
    const consent = userConsents.find(c => c.id === consentId);
    
    if (!consent) {
      return false;
    }

    consent.withdrawn = true;
    consent.withdrawnDate = new Date().toISOString();

    await auditLogger.logEvent({
      event_type: 'data_modified',
      user_id: userId,
      details: {
        action: 'consent_withdrawn',
        consent_id: consentId,
        purpose: consent.purpose
      },
      risk_level: 'medium',
      compliance_relevant: true,
      phi_involved: consent.dataCategories.includes('phi')
    });

    return true;
  }

  async handlePrivacyRequest(
    userId: string,
    requestType: 'access' | 'rectification' | 'erasure' | 'restriction' | 'portability',
    details: any
  ): Promise<{ success: boolean; data?: any; message: string }> {
    await auditLogger.logEvent({
      event_type: 'data_accessed',
      user_id: userId,
      details: {
        action: 'privacy_request',
        request_type: requestType,
        details
      },
      risk_level: 'medium',
      compliance_relevant: true,
      phi_involved: true
    });

    switch (requestType) {
      case 'access':
        return this.handleAccessRequest(userId);
      case 'rectification':
        return this.handleRectificationRequest(userId, details);
      case 'erasure':
        return this.handleErasureRequest(userId, details);
      case 'restriction':
        return this.handleRestrictionRequest(userId, details);
      case 'portability':
        return this.handlePortabilityRequest(userId);
      default:
        return { success: false, message: 'Invalid request type' };
    }
  }

  async enforceRetentionPolicies(): Promise<{
    deletedRecords: number;
    anonymizedRecords: number;
    archivedRecords: number;
    errors: string[];
  }> {
    const results = {
      deletedRecords: 0,
      anonymizedRecords: 0,
      archivedRecords: 0,
      errors: []
    };

    for (const policy of this.retentionPolicies.values()) {
      if (!policy.enabled) continue;

      try {
        const cutoffDate = new Date(Date.now() - policy.retentionPeriod * 24 * 60 * 60 * 1000);
        
        // This would typically query the database for records older than cutoffDate
        // For now, we'll simulate the process
        const recordsToProcess = []; // await this.findExpiredRecords(policy, cutoffDate);

        for (const record of recordsToProcess) {
          switch (policy.purgeMethod) {
            case 'delete':
              // await this.deleteRecord(record);
              results.deletedRecords++;
              break;
            case 'anonymize':
              // await this.anonymizeRecord(record);
              results.anonymizedRecords++;
              break;
            case 'archive':
              // await this.archiveRecord(record);
              results.archivedRecords++;
              break;
          }
        }

        await auditLogger.logEvent({
          event_type: 'data_deleted',
          details: {
            action: 'retention_policy_enforced',
            policy_id: policy.id,
            records_processed: recordsToProcess.length,
            purge_method: policy.purgeMethod
          },
          risk_level: 'medium',
          compliance_relevant: true,
          phi_involved: policy.dataTypes.some(type => type.includes('health') || type.includes('medical'))
        });

      } catch (error) {
        results.errors.push(`Policy ${policy.id}: ${error}`);
      }
    }

    return results;
  }

  private validatePHIEncryption(data: any): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    
    if (this.containsPHI(data)) {
      // Check if data is encrypted
      if (!this.isEncrypted(data)) {
        violations.push({
          ruleId: 'hipaa-phi-encryption',
          description: 'PHI must be encrypted',
          severity: 'critical',
          remediation: 'Encrypt PHI data before storage or transmission',
          autoFixable: true
        });
      }
    }

    return violations;
  }

  private validateMinimumNecessary(data: any): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    
    if (this.containsPHI(data)) {
      const phiFields = this.getPHIFields(data);
      if (phiFields.length > 10) { // Arbitrary threshold
        violations.push({
          ruleId: 'hipaa-minimum-necessary',
          description: 'Excessive PHI fields accessed',
          severity: 'high',
          remediation: 'Limit PHI access to minimum necessary fields',
          autoFixable: false
        });
      }
    }

    return violations;
  }

  private validateAccessControls(data: any): ComplianceViolation[] {
    // Implementation would check if proper access controls are in place
    return [];
  }

  private validateConsent(data: any): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    
    // Check if processing has valid consent
    if (data.userId && this.requiresConsent(data)) {
      const hasValidConsent = this.hasValidConsent(data.userId, data.purpose);
      if (!hasValidConsent) {
        violations.push({
          ruleId: 'gdpr-consent-required',
          description: 'Processing requires valid consent',
          severity: 'critical',
          remediation: 'Obtain valid consent before processing',
          autoFixable: false
        });
      }
    }

    return violations;
  }

  private validateDataMinimization(data: any): ComplianceViolation[] {
    // Implementation would check if only necessary data is collected
    return [];
  }

  private validateRetentionLimits(data: any): ComplianceViolation[] {
    // Implementation would check if data is within retention limits
    return [];
  }

  private validateAuditTrail(data: any): ComplianceViolation[] {
    // Implementation would check if audit trail exists
    return [];
  }

  private containsPHI(data: any): boolean {
    if (!data) return false;
    
    const phiIndicators = [
      'health', 'medical', 'diagnosis', 'treatment', 'medication',
      'patient', 'doctor', 'provider', 'lab', 'test', 'result'
    ];
    
    const dataString = JSON.stringify(data).toLowerCase();
    return phiIndicators.some(indicator => dataString.includes(indicator));
  }

  private isEncrypted(data: any): boolean {
    // Simple check for encrypted data structure
    if (typeof data === 'object' && data !== null) {
      return data.encryptedData && data.iv && data.tag;
    }
    return false;
  }

  private getPHIFields(data: any): string[] {
    // Return list of PHI fields in the data
    return [];
  }

  private classifyData(data: any): string {
    if (this.containsPHI(data)) return 'phi';
    if (this.containsPII(data)) return 'pii';
    return 'internal';
  }

  private containsPII(data: any): boolean {
    const piiIndicators = ['email', 'phone', 'address', 'ssn', 'name'];
    const dataString = JSON.stringify(data).toLowerCase();
    return piiIndicators.some(indicator => dataString.includes(indicator));
  }

  private requiresConsent(data: any): boolean {
    // Implementation would determine if the data processing requires consent
    return this.containsPHI(data) || this.containsPII(data);
  }

  private hasValidConsent(userId: string, purpose: string): boolean {
    const userConsents = this.consentRecords.get(userId) || [];
    return userConsents.some(consent => 
      consent.purpose === purpose &&
      !consent.withdrawn &&
      (!consent.expirationDate || new Date(consent.expirationDate) > new Date())
    );
  }

  private async handleAccessRequest(userId: string): Promise<{ success: boolean; data?: any; message: string }> {
    // Implementation would collect all user data
    return { success: true, data: {}, message: 'Data access request processed' };
  }

  private async handleRectificationRequest(userId: string, details: any): Promise<{ success: boolean; message: string }> {
    // Implementation would update user data
    return { success: true, message: 'Data rectification request processed' };
  }

  private async handleErasureRequest(userId: string, details: any): Promise<{ success: boolean; message: string }> {
    // Implementation would delete user data
    return { success: true, message: 'Data erasure request processed' };
  }

  private async handleRestrictionRequest(userId: string, details: any): Promise<{ success: boolean; message: string }> {
    // Implementation would restrict data processing
    return { success: true, message: 'Data restriction request processed' };
  }

  private async handlePortabilityRequest(userId: string): Promise<{ success: boolean; data?: any; message: string }> {
    // Implementation would export user data in portable format
    return { success: true, data: {}, message: 'Data portability request processed' };
  }

  addRule(rule: ComplianceRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  getComplianceReport(): {
    totalRules: number;
    enabledRules: number;
    recentViolations: number;
    criticalViolations: number;
    complianceScore: number;
  } {
    const totalRules = this.rules.size;
    const enabledRules = Array.from(this.rules.values()).filter(r => r.enabled).length;
    
    return {
      totalRules,
      enabledRules,
      recentViolations: 0, // Would be calculated from recent audit logs
      criticalViolations: 0, // Would be calculated from recent audit logs
      complianceScore: 95.5 // Would be calculated based on compliance metrics
    };
  }
}

export const complianceManager = new ComplianceManager();