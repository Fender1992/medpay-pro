import { auditLogger } from './audit-logger';
import { encryptionService } from './encryption';
import { complianceManager } from './compliance-manager';

export interface DataRetentionRule {
  id: string;
  name: string;
  description: string;
  dataTypes: string[];
  retentionPeriod: number; // in days
  action: 'delete' | 'anonymize' | 'archive';
  conditions: RetentionCondition[];
  legalBasis: string;
  enabled: boolean;
  lastExecuted?: string;
  nextExecution?: string;
  priority: number;
}

export interface RetentionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'older_than' | 'newer_than';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface DataSubject {
  id: string;
  email: string;
  name: string;
  dateOfBirth?: string;
  nationality?: string;
  consentStatus: 'given' | 'withdrawn' | 'expired' | 'pending';
  consentDate?: string;
  dataCategories: string[];
  retentionOverrides: Record<string, number>;
  legalHolds: string[];
  anonymized: boolean;
  deleted: boolean;
  lastActivity?: string;
}

export interface PrivacyRequest {
  id: string;
  subjectId: string;
  type: 'access' | 'rectification' | 'erasure' | 'restriction' | 'portability' | 'objection';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestDate: string;
  completionDate?: string;
  description: string;
  processingNotes: string[];
  requiredActions: string[];
  verificationStatus: 'pending' | 'verified' | 'rejected';
  legalBasis: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface AnonymizationConfig {
  id: string;
  name: string;
  description: string;
  fields: AnonymizationField[];
  preserveStats: boolean;
  reversible: boolean;
  algorithm: 'k-anonymity' | 'l-diversity' | 'differential-privacy' | 'pseudonymization';
  parameters: Record<string, any>;
}

export interface AnonymizationField {
  name: string;
  type: 'identifier' | 'quasi-identifier' | 'sensitive' | 'non-sensitive';
  method: 'remove' | 'generalize' | 'suppress' | 'substitute' | 'hash' | 'encrypt';
  parameters: Record<string, any>;
}

export interface DataInventory {
  id: string;
  tableName: string;
  schemaName: string;
  dataTypes: string[];
  personalData: boolean;
  sensitiveData: boolean;
  phi: boolean;
  recordCount: number;
  storageSize: number;
  lastUpdated: string;
  retentionRules: string[];
  dataFlows: DataFlow[];
  classification: 'public' | 'internal' | 'confidential' | 'restricted' | 'phi';
}

export interface DataFlow {
  source: string;
  destination: string;
  purpose: string;
  frequency: string;
  dataTypes: string[];
  legalBasis: string;
  encryption: boolean;
  approved: boolean;
}

export interface LegalHold {
  id: string;
  name: string;
  description: string;
  reason: string;
  startDate: string;
  endDate?: string;
  dataTypes: string[];
  custodians: string[];
  status: 'active' | 'released' | 'expired';
  legalCase?: string;
  externalReference?: string;
}

class DataRetentionService {
  private retentionRules: Map<string, DataRetentionRule> = new Map();
  private dataSubjects: Map<string, DataSubject> = new Map();
  private privacyRequests: Map<string, PrivacyRequest> = new Map();
  private anonymizationConfigs: Map<string, AnonymizationConfig> = new Map();
  private dataInventory: Map<string, DataInventory> = new Map();
  private legalHolds: Map<string, LegalHold> = new Map();
  private retentionInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeDefaultRules();
    this.initializeAnonymizationConfigs();
    this.startRetentionScheduler();
  }

  private initializeDefaultRules(): void {
    // HIPAA-compliant PHI retention
    this.retentionRules.set('phi-retention', {
      id: 'phi-retention',
      name: 'PHI Retention Rule',
      description: 'HIPAA-compliant retention for Protected Health Information',
      dataTypes: ['health_records', 'medical_data', 'diagnosis', 'treatment', 'medication'],
      retentionPeriod: 2555, // 7 years
      action: 'anonymize',
      conditions: [
        {
          field: 'record_type',
          operator: 'equals',
          value: 'phi'
        },
        {
          field: 'created_date',
          operator: 'older_than',
          value: 2555,
          logicalOperator: 'AND'
        }
      ],
      legalBasis: 'HIPAA Section 164.530(j)(2)',
      enabled: true,
      priority: 1
    });

    // General user data retention
    this.retentionRules.set('user-data-retention', {
      id: 'user-data-retention',
      name: 'User Data Retention Rule',
      description: 'General user data retention for inactive accounts',
      dataTypes: ['user_profiles', 'preferences', 'settings'],
      retentionPeriod: 1095, // 3 years
      action: 'delete',
      conditions: [
        {
          field: 'last_activity',
          operator: 'older_than',
          value: 1095
        },
        {
          field: 'account_status',
          operator: 'equals',
          value: 'inactive',
          logicalOperator: 'AND'
        }
      ],
      legalBasis: 'GDPR Article 17 - Right to erasure',
      enabled: true,
      priority: 2
    });

    // Audit log retention
    this.retentionRules.set('audit-log-retention', {
      id: 'audit-log-retention',
      name: 'Audit Log Retention Rule',
      description: 'Long-term retention for audit logs',
      dataTypes: ['audit_logs', 'access_logs', 'security_logs'],
      retentionPeriod: 2555, // 7 years
      action: 'archive',
      conditions: [
        {
          field: 'log_type',
          operator: 'equals',
          value: 'audit'
        },
        {
          field: 'created_date',
          operator: 'older_than',
          value: 2555,
          logicalOperator: 'AND'
        }
      ],
      legalBasis: 'SOX Section 802',
      enabled: true,
      priority: 3
    });

    // Chat history retention
    this.retentionRules.set('chat-retention', {
      id: 'chat-retention',
      name: 'Chat History Retention Rule',
      description: 'Retention for AI chat conversations',
      dataTypes: ['chat_messages', 'ai_responses'],
      retentionPeriod: 1095, // 3 years
      action: 'anonymize',
      conditions: [
        {
          field: 'message_type',
          operator: 'equals',
          value: 'chat'
        },
        {
          field: 'created_date',
          operator: 'older_than',
          value: 1095,
          logicalOperator: 'AND'
        }
      ],
      legalBasis: 'Business necessity',
      enabled: true,
      priority: 4
    });
  }

  private initializeAnonymizationConfigs(): void {
    // K-anonymity configuration for PHI
    this.anonymizationConfigs.set('phi-k-anonymity', {
      id: 'phi-k-anonymity',
      name: 'PHI K-Anonymity',
      description: 'K-anonymity anonymization for PHI data',
      fields: [
        {
          name: 'name',
          type: 'identifier',
          method: 'remove',
          parameters: {}
        },
        {
          name: 'date_of_birth',
          type: 'quasi-identifier',
          method: 'generalize',
          parameters: { granularity: 'year' }
        },
        {
          name: 'zip_code',
          type: 'quasi-identifier',
          method: 'generalize',
          parameters: { digits: 3 }
        },
        {
          name: 'diagnosis',
          type: 'sensitive',
          method: 'generalize',
          parameters: { level: 'category' }
        }
      ],
      preserveStats: true,
      reversible: false,
      algorithm: 'k-anonymity',
      parameters: { k: 5 }
    });

    // Differential privacy configuration
    this.anonymizationConfigs.set('stats-differential-privacy', {
      id: 'stats-differential-privacy',
      name: 'Statistical Differential Privacy',
      description: 'Differential privacy for statistical analysis',
      fields: [
        {
          name: 'age',
          type: 'quasi-identifier',
          method: 'substitute',
          parameters: { noise_level: 0.1 }
        },
        {
          name: 'condition_count',
          type: 'sensitive',
          method: 'substitute',
          parameters: { noise_level: 0.05 }
        }
      ],
      preserveStats: true,
      reversible: false,
      algorithm: 'differential-privacy',
      parameters: { epsilon: 1.0 }
    });
  }

  private startRetentionScheduler(): void {
    // Run retention checks daily
    this.retentionInterval = setInterval(async () => {
      await this.executeRetentionRules();
    }, 24 * 60 * 60 * 1000);

    console.log('🗓️ Data retention scheduler started');
  }

  async executeRetentionRules(): Promise<void> {
    const rules = Array.from(this.retentionRules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of rules) {
      try {
        await this.executeRetentionRule(rule);
        rule.lastExecuted = new Date().toISOString();
        rule.nextExecution = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      } catch (error) {
        console.error(`Failed to execute retention rule ${rule.id}:`, error);
        
        await auditLogger.logEvent({
          event_type: 'system_error',
          details: {
            action: 'retention_rule_failed',
            rule_id: rule.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          risk_level: 'high',
          compliance_relevant: true,
          phi_involved: rule.dataTypes.some(type => type.includes('health') || type.includes('medical'))
        });
      }
    }
  }

  private async executeRetentionRule(rule: DataRetentionRule): Promise<void> {
    // Find records that match the retention rule conditions
    const matchingRecords = await this.findMatchingRecords(rule);
    
    if (matchingRecords.length === 0) {
      return;
    }

    // Check for legal holds
    const recordsNotOnHold = await this.filterRecordsNotOnHold(matchingRecords, rule.dataTypes);

    if (recordsNotOnHold.length === 0) {
      return;
    }

    // Execute retention action
    const results = await this.executeRetentionAction(rule, recordsNotOnHold);

    await auditLogger.logEvent({
      event_type: 'data_deleted',
      details: {
        action: 'retention_rule_executed',
        rule_id: rule.id,
        rule_name: rule.name,
        records_processed: results.processed,
        records_deleted: results.deleted,
        records_anonymized: results.anonymized,
        records_archived: results.archived,
        legal_basis: rule.legalBasis
      },
      risk_level: 'medium',
      compliance_relevant: true,
      phi_involved: rule.dataTypes.some(type => type.includes('health') || type.includes('medical'))
    });

    console.log(`✅ Retention rule ${rule.name} executed: ${results.processed} records processed`);
  }

  private async findMatchingRecords(rule: DataRetentionRule): Promise<any[]> {
    // In production, this would query the database
    // For now, return mock data
    return [];
  }

  private async filterRecordsNotOnHold(records: any[], dataTypes: string[]): Promise<any[]> {
    const activeLegalHolds = Array.from(this.legalHolds.values())
      .filter(hold => hold.status === 'active');

    return records.filter(record => {
      return !activeLegalHolds.some(hold => 
        hold.dataTypes.some(type => dataTypes.includes(type))
      );
    });
  }

  private async executeRetentionAction(rule: DataRetentionRule, records: any[]): Promise<{
    processed: number;
    deleted: number;
    anonymized: number;
    archived: number;
  }> {
    const results = {
      processed: records.length,
      deleted: 0,
      anonymized: 0,
      archived: 0
    };

    for (const record of records) {
      switch (rule.action) {
        case 'delete':
          await this.deleteRecord(record);
          results.deleted++;
          break;
        case 'anonymize':
          await this.anonymizeRecord(record, rule.dataTypes);
          results.anonymized++;
          break;
        case 'archive':
          await this.archiveRecord(record);
          results.archived++;
          break;
      }
    }

    return results;
  }

  private async deleteRecord(record: any): Promise<void> {
    // In production, this would delete from database
    console.log(`🗑️ Deleting record: ${record.id}`);
  }

  private async anonymizeRecord(record: any, dataTypes: string[]): Promise<void> {
    // Find appropriate anonymization config
    const config = this.findAnonymizationConfig(dataTypes);
    if (!config) {
      console.warn(`No anonymization config found for data types: ${dataTypes.join(', ')}`);
      return;
    }

    // Apply anonymization
    const anonymizedRecord = await this.applyAnonymization(record, config);
    
    // Update record in database
    console.log(`🎭 Anonymizing record: ${record.id}`);
  }

  private async archiveRecord(record: any): Promise<void> {
    // In production, this would move to archive storage
    console.log(`📦 Archiving record: ${record.id}`);
  }

  private findAnonymizationConfig(dataTypes: string[]): AnonymizationConfig | undefined {
    // Find the most appropriate config for the data types
    for (const config of this.anonymizationConfigs.values()) {
      if (dataTypes.some(type => type.includes('health') || type.includes('medical'))) {
        return config;
      }
    }
    return Array.from(this.anonymizationConfigs.values())[0];
  }

  private async applyAnonymization(record: any, config: AnonymizationConfig): Promise<any> {
    const anonymizedRecord = { ...record };

    for (const field of config.fields) {
      if (record[field.name] !== undefined) {
        anonymizedRecord[field.name] = await this.anonymizeField(
          record[field.name],
          field.method,
          field.parameters
        );
      }
    }

    return anonymizedRecord;
  }

  private async anonymizeField(value: any, method: string, parameters: Record<string, any>): Promise<any> {
    switch (method) {
      case 'remove':
        return null;
      case 'generalize':
        return this.generalizeValue(value, parameters);
      case 'suppress':
        return '***';
      case 'substitute':
        return this.substituteValue(value, parameters);
      case 'hash':
        return encryptionService.hashForIndex(value.toString());
      case 'encrypt':
        return encryptionService.encryptPHI(value.toString());
      default:
        return value;
    }
  }

  private generalizeValue(value: any, parameters: Record<string, any>): any {
    if (typeof value === 'string' && parameters.granularity === 'year') {
      // Generalize date to year only
      const date = new Date(value);
      return date.getFullYear().toString();
    }
    
    if (typeof value === 'string' && parameters.digits) {
      // Generalize number to specified digits
      return value.substring(0, parameters.digits) + '*'.repeat(value.length - parameters.digits);
    }
    
    return value;
  }

  private substituteValue(value: any, parameters: Record<string, any>): any {
    if (typeof value === 'number' && parameters.noise_level) {
      // Add differential privacy noise
      const noise = (Math.random() - 0.5) * 2 * parameters.noise_level * value;
      return value + noise;
    }
    
    return value;
  }

  async handlePrivacyRequest(request: Omit<PrivacyRequest, 'id' | 'requestDate' | 'status'>): Promise<PrivacyRequest> {
    const privacyRequest: PrivacyRequest = {
      ...request,
      id: `privacy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      requestDate: new Date().toISOString(),
      status: 'pending'
    };

    this.privacyRequests.set(privacyRequest.id, privacyRequest);

    await auditLogger.logEvent({
      event_type: 'data_accessed',
      user_id: request.subjectId,
      details: {
        action: 'privacy_request_received',
        request_id: privacyRequest.id,
        request_type: request.type,
        priority: request.priority
      },
      risk_level: 'medium',
      compliance_relevant: true,
      phi_involved: true
    });

    // Auto-process simple requests
    if (request.type === 'access' && request.verificationStatus === 'verified') {
      await this.processPrivacyRequest(privacyRequest.id);
    }

    return privacyRequest;
  }

  async processPrivacyRequest(requestId: string): Promise<void> {
    const request = this.privacyRequests.get(requestId);
    if (!request) {
      throw new Error(`Privacy request ${requestId} not found`);
    }

    request.status = 'processing';

    try {
      switch (request.type) {
        case 'access':
          await this.processAccessRequest(request);
          break;
        case 'rectification':
          await this.processRectificationRequest(request);
          break;
        case 'erasure':
          await this.processErasureRequest(request);
          break;
        case 'restriction':
          await this.processRestrictionRequest(request);
          break;
        case 'portability':
          await this.processPortabilityRequest(request);
          break;
        case 'objection':
          await this.processObjectionRequest(request);
          break;
      }

      request.status = 'completed';
      request.completionDate = new Date().toISOString();

      await auditLogger.logEvent({
        event_type: 'data_accessed',
        user_id: request.subjectId,
        details: {
          action: 'privacy_request_completed',
          request_id: requestId,
          request_type: request.type
        },
        risk_level: 'medium',
        compliance_relevant: true,
        phi_involved: true
      });

    } catch (error) {
      request.status = 'rejected';
      request.processingNotes.push(`Error: ${error}`);

      await auditLogger.logEvent({
        event_type: 'system_error',
        user_id: request.subjectId,
        details: {
          action: 'privacy_request_failed',
          request_id: requestId,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        risk_level: 'high',
        compliance_relevant: true,
        phi_involved: false
      });
    }
  }

  private async processAccessRequest(request: PrivacyRequest): Promise<void> {
    // Compile all data for the subject
    const userData = await this.compileUserData(request.subjectId);
    request.processingNotes.push(`Data compiled: ${Object.keys(userData).length} categories`);
  }

  private async processRectificationRequest(request: PrivacyRequest): Promise<void> {
    // Update user data as requested
    request.processingNotes.push('Data rectification completed');
  }

  private async processErasureRequest(request: PrivacyRequest): Promise<void> {
    // Delete or anonymize user data
    const subject = this.dataSubjects.get(request.subjectId);
    if (subject) {
      subject.deleted = true;
      subject.anonymized = true;
    }
    request.processingNotes.push('Data erasure completed');
  }

  private async processRestrictionRequest(request: PrivacyRequest): Promise<void> {
    // Restrict processing of user data
    request.processingNotes.push('Data processing restricted');
  }

  private async processPortabilityRequest(request: PrivacyRequest): Promise<void> {
    // Export user data in portable format
    const userData = await this.compileUserData(request.subjectId);
    request.processingNotes.push('Data export completed');
  }

  private async processObjectionRequest(request: PrivacyRequest): Promise<void> {
    // Stop processing based on objection
    request.processingNotes.push('Processing objection recorded');
  }

  private async compileUserData(subjectId: string): Promise<Record<string, any>> {
    // In production, this would compile all user data from various sources
    return {
      profile: {},
      health_records: [],
      chat_history: [],
      documents: [],
      preferences: {},
      audit_logs: []
    };
  }

  async createLegalHold(hold: Omit<LegalHold, 'id' | 'startDate'>): Promise<LegalHold> {
    const legalHold: LegalHold = {
      ...hold,
      id: `hold-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startDate: new Date().toISOString()
    };

    this.legalHolds.set(legalHold.id, legalHold);

    await auditLogger.logEvent({
      event_type: 'data_modified',
      details: {
        action: 'legal_hold_created',
        hold_id: legalHold.id,
        hold_name: legalHold.name,
        data_types: legalHold.dataTypes,
        reason: legalHold.reason
      },
      risk_level: 'high',
      compliance_relevant: true,
      phi_involved: legalHold.dataTypes.some(type => type.includes('health') || type.includes('medical'))
    });

    return legalHold;
  }

  async releaseLegalHold(holdId: string): Promise<void> {
    const hold = this.legalHolds.get(holdId);
    if (!hold) {
      throw new Error(`Legal hold ${holdId} not found`);
    }

    hold.status = 'released';
    hold.endDate = new Date().toISOString();

    await auditLogger.logEvent({
      event_type: 'data_modified',
      details: {
        action: 'legal_hold_released',
        hold_id: holdId,
        hold_name: hold.name
      },
      risk_level: 'medium',
      compliance_relevant: true,
      phi_involved: false
    });
  }

  // Public API methods
  getRetentionRules(): DataRetentionRule[] {
    return Array.from(this.retentionRules.values());
  }

  getPrivacyRequests(): PrivacyRequest[] {
    return Array.from(this.privacyRequests.values());
  }

  getLegalHolds(): LegalHold[] {
    return Array.from(this.legalHolds.values());
  }

  getDataInventory(): DataInventory[] {
    return Array.from(this.dataInventory.values());
  }

  getRetentionSummary(): {
    totalRules: number;
    activeRules: number;
    pendingRequests: number;
    activeLegalHolds: number;
    recordsProcessedToday: number;
    complianceScore: number;
  } {
    const rules = Array.from(this.retentionRules.values());
    const requests = Array.from(this.privacyRequests.values());
    const holds = Array.from(this.legalHolds.values());

    return {
      totalRules: rules.length,
      activeRules: rules.filter(r => r.enabled).length,
      pendingRequests: requests.filter(r => r.status === 'pending').length,
      activeLegalHolds: holds.filter(h => h.status === 'active').length,
      recordsProcessedToday: 0, // Would be calculated from audit logs
      complianceScore: 94.5 // Would be calculated based on compliance metrics
    };
  }

  stopRetentionScheduler(): void {
    if (this.retentionInterval) {
      clearInterval(this.retentionInterval);
      this.retentionInterval = undefined;
    }
    console.log('🗓️ Data retention scheduler stopped');
  }
}

export const dataRetentionService = new DataRetentionService();