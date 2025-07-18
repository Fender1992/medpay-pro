import { createClient } from '@supabase/supabase-js';
import { User } from '@/types';

export type AuditEventType = 
  | 'user_login' 
  | 'user_logout' 
  | 'user_created' 
  | 'user_updated' 
  | 'user_deleted'
  | 'password_changed'
  | 'data_accessed'
  | 'data_modified'
  | 'data_deleted'
  | 'document_uploaded'
  | 'document_accessed'
  | 'document_deleted'
  | 'chat_message_sent'
  | 'chat_message_received'
  | 'ai_response_generated'
  | 'health_data_accessed'
  | 'health_data_modified'
  | 'system_error'
  | 'security_violation'
  | 'api_key_used'
  | 'rate_limit_exceeded'
  | 'hipaa_violation_detected'
  | 'data_export'
  | 'data_backup'
  | 'system_maintenance';

export interface AuditEvent {
  id?: string;
  event_type: AuditEventType;
  user_id?: string;
  user_role?: string;
  user_email?: string;
  resource_type?: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  timestamp: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  compliance_relevant: boolean;
  phi_involved: boolean;
  location?: string;
}

export interface AuditQuery {
  user_id?: string;
  event_type?: AuditEventType;
  start_date?: string;
  end_date?: string;
  risk_level?: string;
  phi_involved?: boolean;
  limit?: number;
  offset?: number;
}

class AuditLogger {
  private supabase: ReturnType<typeof createClient> | null = null;
  private localLogs: AuditEvent[] = [];
  private useDatabase: boolean = false;
  private isInitialized: boolean = false;

  constructor() {
    this.initializeLogger();
  }

  private initializeLogger() {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey && 
          supabaseUrl !== 'https://placeholder.supabase.co' && 
          supabaseKey !== 'placeholder-anon-key') {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.useDatabase = true;
      }
      
      this.isInitialized = true;
      console.log(`🔍 Audit Logger initialized: ${this.useDatabase ? 'Database' : 'Local'} mode`);
    } catch (error) {
      console.error('Failed to initialize audit logger:', error);
      this.useDatabase = false;
      this.isInitialized = true;
    }
  }

  async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    if (!this.isInitialized) {
      this.initializeLogger();
    }

    const auditEvent: AuditEvent = {
      ...event,
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    try {
      if (this.useDatabase && this.supabase) {
        await this.supabase
          .from('audit_logs')
          .insert(auditEvent);
      } else {
        this.localLogs.push(auditEvent);
        // Keep only last 1000 logs in memory
        if (this.localLogs.length > 1000) {
          this.localLogs = this.localLogs.slice(-1000);
        }
      }

      // Log critical events to console regardless
      if (auditEvent.risk_level === 'critical') {
        console.error('🚨 CRITICAL AUDIT EVENT:', auditEvent);
      }

      // Trigger alerts for high-risk events
      if (auditEvent.risk_level === 'high' || auditEvent.risk_level === 'critical') {
        this.triggerSecurityAlert(auditEvent);
      }

    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Fallback to local logging
      this.localLogs.push(auditEvent);
    }
  }

  private async triggerSecurityAlert(event: AuditEvent): Promise<void> {
    // In production, this would send alerts to security team
    console.warn('⚠️ Security Alert triggered:', {
      event_type: event.event_type,
      user_id: event.user_id,
      risk_level: event.risk_level,
      timestamp: event.timestamp
    });

    // Could integrate with:
    // - Email notifications
    // - Slack/Teams webhooks
    // - PagerDuty
    // - Security Information and Event Management (SIEM) systems
  }

  async queryAuditLogs(query: AuditQuery): Promise<AuditEvent[]> {
    if (!this.isInitialized) {
      this.initializeLogger();
    }

    try {
      if (this.useDatabase && this.supabase) {
        let dbQuery = this.supabase
          .from('audit_logs')
          .select('*')
          .order('timestamp', { ascending: false });

        if (query.user_id) {
          dbQuery = dbQuery.eq('user_id', query.user_id);
        }
        if (query.event_type) {
          dbQuery = dbQuery.eq('event_type', query.event_type);
        }
        if (query.start_date) {
          dbQuery = dbQuery.gte('timestamp', query.start_date);
        }
        if (query.end_date) {
          dbQuery = dbQuery.lte('timestamp', query.end_date);
        }
        if (query.risk_level) {
          dbQuery = dbQuery.eq('risk_level', query.risk_level);
        }
        if (query.phi_involved !== undefined) {
          dbQuery = dbQuery.eq('phi_involved', query.phi_involved);
        }
        if (query.limit) {
          dbQuery = dbQuery.limit(query.limit);
        }
        if (query.offset) {
          dbQuery = dbQuery.range(query.offset, query.offset + (query.limit || 50) - 1);
        }

        const { data, error } = await dbQuery;
        
        if (error) {
          throw error;
        }

        return data || [];
      } else {
        // Filter local logs
        let filteredLogs = this.localLogs;

        if (query.user_id) {
          filteredLogs = filteredLogs.filter(log => log.user_id === query.user_id);
        }
        if (query.event_type) {
          filteredLogs = filteredLogs.filter(log => log.event_type === query.event_type);
        }
        if (query.start_date) {
          filteredLogs = filteredLogs.filter(log => log.timestamp >= query.start_date!);
        }
        if (query.end_date) {
          filteredLogs = filteredLogs.filter(log => log.timestamp <= query.end_date!);
        }
        if (query.risk_level) {
          filteredLogs = filteredLogs.filter(log => log.risk_level === query.risk_level);
        }
        if (query.phi_involved !== undefined) {
          filteredLogs = filteredLogs.filter(log => log.phi_involved === query.phi_involved);
        }

        // Sort by timestamp descending
        filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Apply pagination
        const start = query.offset || 0;
        const limit = query.limit || 50;
        return filteredLogs.slice(start, start + limit);
      }
    } catch (error) {
      console.error('Failed to query audit logs:', error);
      return [];
    }
  }

  async logUserLogin(user: User, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      event_type: 'user_login',
      user_id: user.id,
      user_role: user.role,
      user_email: user.email,
      details: {
        name: user.name,
        department: user.department,
        facility: user.facility
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      risk_level: 'low',
      compliance_relevant: true,
      phi_involved: false
    });
  }

  async logUserLogout(user: User, ipAddress?: string): Promise<void> {
    await this.logEvent({
      event_type: 'user_logout',
      user_id: user.id,
      user_role: user.role,
      user_email: user.email,
      details: {
        name: user.name
      },
      ip_address: ipAddress,
      risk_level: 'low',
      compliance_relevant: true,
      phi_involved: false
    });
  }

  async logDataAccess(
    user: User, 
    resourceType: string, 
    resourceId: string, 
    details: Record<string, any>,
    phiInvolved: boolean = true
  ): Promise<void> {
    await this.logEvent({
      event_type: 'data_accessed',
      user_id: user.id,
      user_role: user.role,
      user_email: user.email,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      risk_level: phiInvolved ? 'medium' : 'low',
      compliance_relevant: true,
      phi_involved: phiInvolved
    });
  }

  async logChatInteraction(
    user: User,
    message: string,
    response: string,
    aiModel: string,
    ipAddress?: string
  ): Promise<void> {
    await this.logEvent({
      event_type: 'chat_message_sent',
      user_id: user.id,
      user_role: user.role,
      user_email: user.email,
      details: {
        message_preview: message.substring(0, 100),
        response_preview: response.substring(0, 100),
        ai_model: aiModel,
        message_length: message.length,
        response_length: response.length
      },
      ip_address: ipAddress,
      risk_level: 'medium',
      compliance_relevant: true,
      phi_involved: true
    });
  }

  async logSecurityViolation(
    userId: string | undefined,
    violationType: string,
    details: Record<string, any>,
    ipAddress?: string
  ): Promise<void> {
    await this.logEvent({
      event_type: 'security_violation',
      user_id: userId,
      details: {
        violation_type: violationType,
        ...details
      },
      ip_address: ipAddress,
      risk_level: 'critical',
      compliance_relevant: true,
      phi_involved: false
    });
  }

  async logHIPAAViolation(
    userId: string,
    violationType: string,
    details: Record<string, any>,
    ipAddress?: string
  ): Promise<void> {
    await this.logEvent({
      event_type: 'hipaa_violation_detected',
      user_id: userId,
      details: {
        violation_type: violationType,
        ...details
      },
      ip_address: ipAddress,
      risk_level: 'critical',
      compliance_relevant: true,
      phi_involved: true
    });
  }

  async logSystemError(
    error: Error,
    userId?: string,
    context?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      event_type: 'system_error',
      user_id: userId,
      details: {
        error_message: error.message,
        error_stack: error.stack,
        context
      },
      risk_level: 'medium',
      compliance_relevant: false,
      phi_involved: false
    });
  }

  async exportAuditLogs(
    query: AuditQuery,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const logs = await this.queryAuditLogs(query);
    
    if (format === 'csv') {
      const headers = ['timestamp', 'event_type', 'user_id', 'user_email', 'resource_type', 'resource_id', 'risk_level', 'phi_involved'];
      const csvData = logs.map(log => [
        log.timestamp,
        log.event_type,
        log.user_id || '',
        log.user_email || '',
        log.resource_type || '',
        log.resource_id || '',
        log.risk_level,
        log.phi_involved
      ]);
      
      return [headers, ...csvData].map(row => row.join(',')).join('\n');
    }
    
    return JSON.stringify(logs, null, 2);
  }

  getAuditStats(): {
    totalLogs: number;
    criticalEvents: number;
    phiAccess: number;
    securityViolations: number;
    last24Hours: number;
  } {
    const logs = this.localLogs;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    return {
      totalLogs: logs.length,
      criticalEvents: logs.filter(log => log.risk_level === 'critical').length,
      phiAccess: logs.filter(log => log.phi_involved).length,
      securityViolations: logs.filter(log => log.event_type === 'security_violation').length,
      last24Hours: logs.filter(log => log.timestamp >= yesterday).length
    };
  }
}

export const auditLogger = new AuditLogger();