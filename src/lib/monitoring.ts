import { auditLogger } from './audit-logger';

export interface SystemMetrics {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  response_time: number;
  error_rate: number;
  active_users: number;
  api_requests: number;
  database_connections: number;
  ai_api_calls: number;
  cost_per_hour: number;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: string;
  error?: string;
  details?: Record<string, any>;
}

export interface Alert {
  id: string;
  type: 'performance' | 'security' | 'compliance' | 'cost' | 'error' | 'health';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  actions: string[];
  metadata: Record<string, any>;
}

export interface ErrorContext {
  userId?: string;
  userRole?: string;
  endpoint?: string;
  method?: string;
  timestamp: string;
  stack?: string;
  userAgent?: string;
  ipAddress?: string;
  requestId?: string;
  additionalData?: Record<string, any>;
}

export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  requestCount: number;
  errorCount: number;
  successRate: number;
  last24Hours: number[];
}

class MonitoringService {
  private metrics: SystemMetrics[] = [];
  private alerts: Map<string, Alert> = new Map();
  private healthChecks: Map<string, HealthCheck> = new Map();
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  private readonly thresholds = {
    cpu_usage: 80,
    memory_usage: 85,
    disk_usage: 90,
    response_time: 5000, // 5 seconds
    error_rate: 5, // 5%
    cost_per_hour: 50, // $50/hour
    api_calls_per_minute: 100
  };

  constructor() {
    this.initializeHealthChecks();
    this.startMonitoring();
  }

  private initializeHealthChecks(): void {
    // Initialize health checks for various services
    this.healthChecks.set('database', {
      service: 'database',
      status: 'healthy',
      responseTime: 0,
      lastCheck: new Date().toISOString()
    });

    this.healthChecks.set('claude-ai', {
      service: 'claude-ai',
      status: 'healthy',
      responseTime: 0,
      lastCheck: new Date().toISOString()
    });

    this.healthChecks.set('openai', {
      service: 'openai',
      status: 'healthy',
      responseTime: 0,
      lastCheck: new Date().toISOString()
    });

    this.healthChecks.set('storage', {
      service: 'storage',
      status: 'healthy',
      responseTime: 0,
      lastCheck: new Date().toISOString()
    });
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Collect metrics every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
      await this.performHealthChecks();
      await this.checkThresholds();
    }, 30000);

    console.log('📊 Monitoring service started');
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
    console.log('📊 Monitoring service stopped');
  }

  async collectMetrics(): Promise<void> {
    const now = new Date().toISOString();
    
    // Collect system metrics (in production, these would come from actual system monitoring)
    const metrics: SystemMetrics = {
      timestamp: now,
      cpu_usage: this.getCPUUsage(),
      memory_usage: this.getMemoryUsage(),
      disk_usage: this.getDiskUsage(),
      response_time: this.getAverageResponseTime(),
      error_rate: this.getErrorRate(),
      active_users: this.getActiveUsers(),
      api_requests: this.getAPIRequests(),
      database_connections: this.getDatabaseConnections(),
      ai_api_calls: this.getAIAPICalls(),
      cost_per_hour: this.getCostPerHour()
    };

    this.metrics.push(metrics);
    
    // Keep only last 24 hours of metrics
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => new Date(m.timestamp) > oneDayAgo);
  }

  async performHealthChecks(): Promise<void> {
    const checks = Array.from(this.healthChecks.keys());
    
    for (const service of checks) {
      const startTime = Date.now();
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let error: string | undefined;
      let details: Record<string, any> = {};

      try {
        switch (service) {
          case 'database':
            details = await this.checkDatabaseHealth();
            break;
          case 'claude-ai':
            details = await this.checkClaudeAIHealth();
            break;
          case 'openai':
            details = await this.checkOpenAIHealth();
            break;
          case 'storage':
            details = await this.checkStorageHealth();
            break;
        }
      } catch (err) {
        status = 'unhealthy';
        error = err instanceof Error ? err.message : 'Unknown error';
      }

      const responseTime = Date.now() - startTime;
      
      // Determine status based on response time
      if (responseTime > 10000) { // 10 seconds
        status = 'unhealthy';
      } else if (responseTime > 5000) { // 5 seconds
        status = 'degraded';
      }

      const healthCheck: HealthCheck = {
        service,
        status,
        responseTime,
        lastCheck: new Date().toISOString(),
        error,
        details
      };

      this.healthChecks.set(service, healthCheck);

      // Create alert if service is unhealthy
      if (status === 'unhealthy') {
        await this.createAlert({
          type: 'health',
          severity: 'critical',
          title: `Service ${service} is unhealthy`,
          description: `Health check failed for ${service}: ${error}`,
          metadata: { service, responseTime, error }
        });
      }
    }
  }

  async checkThresholds(): Promise<void> {
    const latestMetrics = this.metrics[this.metrics.length - 1];
    if (!latestMetrics) return;

    // Check CPU usage
    if (latestMetrics.cpu_usage > this.thresholds.cpu_usage) {
      await this.createAlert({
        type: 'performance',
        severity: 'high',
        title: 'High CPU Usage',
        description: `CPU usage is ${latestMetrics.cpu_usage}%`,
        metadata: { cpu_usage: latestMetrics.cpu_usage }
      });
    }

    // Check memory usage
    if (latestMetrics.memory_usage > this.thresholds.memory_usage) {
      await this.createAlert({
        type: 'performance',
        severity: 'high',
        title: 'High Memory Usage',
        description: `Memory usage is ${latestMetrics.memory_usage}%`,
        metadata: { memory_usage: latestMetrics.memory_usage }
      });
    }

    // Check disk usage
    if (latestMetrics.disk_usage > this.thresholds.disk_usage) {
      await this.createAlert({
        type: 'performance',
        severity: 'critical',
        title: 'High Disk Usage',
        description: `Disk usage is ${latestMetrics.disk_usage}%`,
        metadata: { disk_usage: latestMetrics.disk_usage }
      });
    }

    // Check response time
    if (latestMetrics.response_time > this.thresholds.response_time) {
      await this.createAlert({
        type: 'performance',
        severity: 'medium',
        title: 'High Response Time',
        description: `Average response time is ${latestMetrics.response_time}ms`,
        metadata: { response_time: latestMetrics.response_time }
      });
    }

    // Check error rate
    if (latestMetrics.error_rate > this.thresholds.error_rate) {
      await this.createAlert({
        type: 'error',
        severity: 'high',
        title: 'High Error Rate',
        description: `Error rate is ${latestMetrics.error_rate}%`,
        metadata: { error_rate: latestMetrics.error_rate }
      });
    }

    // Check cost per hour
    if (latestMetrics.cost_per_hour > this.thresholds.cost_per_hour) {
      await this.createAlert({
        type: 'cost',
        severity: 'medium',
        title: 'High Cost',
        description: `Cost per hour is $${latestMetrics.cost_per_hour}`,
        metadata: { cost_per_hour: latestMetrics.cost_per_hour }
      });
    }
  }

  async recordError(error: Error, context: ErrorContext): Promise<void> {
    const errorKey = `${context.endpoint || 'unknown'}-${error.name}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);

    // Log error to audit system
    await auditLogger.logSystemError(error, context.userId, {
      endpoint: context.endpoint,
      method: context.method,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      requestId: context.requestId,
      additionalData: context.additionalData
    });

    // Create alert for critical errors
    if (this.isCriticalError(error) || currentCount > 10) {
      await this.createAlert({
        type: 'error',
        severity: 'critical',
        title: `Critical Error: ${error.name}`,
        description: error.message,
        metadata: {
          error: error.name,
          stack: error.stack,
          context,
          count: currentCount
        }
      });
    }
  }

  async recordPerformance(
    endpoint: string,
    method: string,
    responseTime: number,
    success: boolean
  ): Promise<void> {
    const key = `${method}-${endpoint}`;
    let metrics = this.performanceMetrics.get(key);

    if (!metrics) {
      metrics = {
        endpoint,
        method,
        averageResponseTime: responseTime,
        maxResponseTime: responseTime,
        minResponseTime: responseTime,
        requestCount: 1,
        errorCount: success ? 0 : 1,
        successRate: success ? 100 : 0,
        last24Hours: [responseTime]
      };
    } else {
      metrics.requestCount++;
      metrics.errorCount += success ? 0 : 1;
      metrics.maxResponseTime = Math.max(metrics.maxResponseTime, responseTime);
      metrics.minResponseTime = Math.min(metrics.minResponseTime, responseTime);
      metrics.averageResponseTime = (metrics.averageResponseTime + responseTime) / 2;
      metrics.successRate = ((metrics.requestCount - metrics.errorCount) / metrics.requestCount) * 100;
      
      // Keep only last 24 hours
      metrics.last24Hours.push(responseTime);
      if (metrics.last24Hours.length > 2880) { // 24 hours * 60 minutes * 2 (30-second intervals)
        metrics.last24Hours = metrics.last24Hours.slice(-2880);
      }
    }

    this.performanceMetrics.set(key, metrics);
  }

  private async createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'resolved' | 'actions'>): Promise<void> {
    const alert: Alert = {
      ...alertData,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      resolved: false,
      actions: this.getRecommendedActions(alertData.type, alertData.severity)
    };

    this.alerts.set(alert.id, alert);

    // Send notifications (in production, this would integrate with notification systems)
    await this.sendNotification(alert);

    console.warn(`🚨 Alert created: ${alert.title}`);
  }

  private async sendNotification(alert: Alert): Promise<void> {
    // In production, this would integrate with:
    // - Email notifications
    // - Slack/Teams webhooks
    // - PagerDuty
    // - SMS alerts
    // - Push notifications
    
    if (alert.severity === 'critical') {
      // Send immediate notifications
      console.error('📧 Critical alert notification sent:', alert.title);
    }
  }

  private getRecommendedActions(type: string, severity: string): string[] {
    const actions: string[] = [];
    
    switch (type) {
      case 'performance':
        actions.push('Check system resources');
        actions.push('Review slow queries');
        actions.push('Consider scaling');
        break;
      case 'error':
        actions.push('Check error logs');
        actions.push('Review recent deployments');
        actions.push('Validate system configuration');
        break;
      case 'cost':
        actions.push('Review API usage');
        actions.push('Check rate limiting');
        actions.push('Optimize expensive operations');
        break;
      case 'health':
        actions.push('Check service status');
        actions.push('Verify network connectivity');
        actions.push('Review service logs');
        break;
    }

    if (severity === 'critical') {
      actions.unshift('Immediate attention required');
    }

    return actions;
  }

  private isCriticalError(error: Error): boolean {
    const criticalErrors = [
      'DatabaseConnectionError',
      'AuthenticationError',
      'AuthorizationError',
      'DataCorruptionError',
      'SecurityViolationError',
      'PHIExposureError'
    ];

    return criticalErrors.includes(error.name) || 
           error.message.toLowerCase().includes('critical') ||
           error.message.toLowerCase().includes('security');
  }

  // Mock implementations for system metrics (in production, these would use actual system monitoring)
  private getCPUUsage(): number {
    return Math.random() * 100;
  }

  private getMemoryUsage(): number {
    return Math.random() * 100;
  }

  private getDiskUsage(): number {
    return Math.random() * 100;
  }

  private getAverageResponseTime(): number {
    return Math.random() * 3000;
  }

  private getErrorRate(): number {
    return Math.random() * 10;
  }

  private getActiveUsers(): number {
    return Math.floor(Math.random() * 100);
  }

  private getAPIRequests(): number {
    return Math.floor(Math.random() * 1000);
  }

  private getDatabaseConnections(): number {
    return Math.floor(Math.random() * 20);
  }

  private getAIAPICalls(): number {
    return Math.floor(Math.random() * 100);
  }

  private getCostPerHour(): number {
    return Math.random() * 100;
  }

  // Health check implementations
  private async checkDatabaseHealth(): Promise<Record<string, any>> {
    // Simulate database health check
    return {
      connections: 5,
      query_time: 50,
      status: 'connected'
    };
  }

  private async checkClaudeAIHealth(): Promise<Record<string, any>> {
    // Simulate Claude AI health check
    return {
      api_status: 'operational',
      rate_limit_remaining: 100,
      last_request: new Date().toISOString()
    };
  }

  private async checkOpenAIHealth(): Promise<Record<string, any>> {
    // Simulate OpenAI health check
    return {
      api_status: 'operational',
      rate_limit_remaining: 100,
      last_request: new Date().toISOString()
    };
  }

  private async checkStorageHealth(): Promise<Record<string, any>> {
    // Simulate storage health check
    return {
      available_space: '500GB',
      read_latency: 10,
      write_latency: 15
    };
  }

  // Public API methods
  getSystemMetrics(): SystemMetrics[] {
    return this.metrics.slice(-100); // Last 100 metrics
  }

  getHealthStatus(): HealthCheck[] {
    return Array.from(this.healthChecks.values());
  }

  getAlerts(resolved: boolean = false): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.resolved === resolved);
  }

  getPerformanceMetrics(): PerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values());
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
    
    await auditLogger.logEvent({
      event_type: 'system_maintenance',
      details: {
        action: 'alert_resolved',
        alert_id: alertId,
        alert_type: alert.type,
        alert_severity: alert.severity
      },
      risk_level: 'low',
      compliance_relevant: false,
      phi_involved: false
    });

    return true;
  }

  getDashboardSummary(): {
    systemHealth: 'healthy' | 'degraded' | 'unhealthy';
    activeAlerts: number;
    criticalAlerts: number;
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
  } {
    const healthChecks = Array.from(this.healthChecks.values());
    const systemHealth = healthChecks.every(h => h.status === 'healthy') ? 'healthy' :
                        healthChecks.some(h => h.status === 'unhealthy') ? 'unhealthy' : 'degraded';

    const alerts = Array.from(this.alerts.values()).filter(a => !a.resolved);
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;

    const latestMetrics = this.metrics[this.metrics.length - 1];
    const averageResponseTime = latestMetrics?.response_time || 0;
    const errorRate = latestMetrics?.error_rate || 0;

    return {
      systemHealth,
      activeAlerts: alerts.length,
      criticalAlerts,
      averageResponseTime,
      errorRate,
      uptime: 99.9 // Would be calculated from actual uptime
    };
  }
}

export const monitoringService = new MonitoringService();