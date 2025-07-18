import { auditLogger } from './audit-logger';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  costPerRequest: number;
  burstLimit?: number;
  userTier?: 'basic' | 'premium' | 'enterprise';
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  costIncurred: number;
  reason?: string;
}

export interface CostTracker {
  dailyCost: number;
  monthlyCost: number;
  totalCost: number;
  lastReset: number;
  averageRequestCost: number;
  requestCount: number;
}

export interface UserLimits {
  daily: RateLimitConfig;
  hourly: RateLimitConfig;
  monthly: RateLimitConfig;
  concurrent: number;
}

class RateLimiterService {
  private userRequests: Map<string, Map<string, number[]>> = new Map();
  private userCosts: Map<string, CostTracker> = new Map();
  private activeSessions: Map<string, number> = new Map();
  private globalCosts: CostTracker = {
    dailyCost: 0,
    monthlyCost: 0,
    totalCost: 0,
    lastReset: Date.now(),
    averageRequestCost: 0,
    requestCount: 0
  };

  private readonly defaultLimits: Record<string, UserLimits> = {
    user: {
      daily: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 100, costPerRequest: 0.02 },
      hourly: { windowMs: 60 * 60 * 1000, maxRequests: 20, costPerRequest: 0.02 },
      monthly: { windowMs: 30 * 24 * 60 * 60 * 1000, maxRequests: 2000, costPerRequest: 0.02 },
      concurrent: 3
    },
    provider: {
      daily: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 500, costPerRequest: 0.02 },
      hourly: { windowMs: 60 * 60 * 1000, maxRequests: 100, costPerRequest: 0.02 },
      monthly: { windowMs: 30 * 24 * 60 * 60 * 1000, maxRequests: 10000, costPerRequest: 0.02 },
      concurrent: 10
    },
    admin: {
      daily: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 1000, costPerRequest: 0.02 },
      hourly: { windowMs: 60 * 60 * 1000, maxRequests: 200, costPerRequest: 0.02 },
      monthly: { windowMs: 30 * 24 * 60 * 60 * 1000, maxRequests: 20000, costPerRequest: 0.02 },
      concurrent: 20
    }
  };

  private readonly costLimits = {
    daily: 100.0,      // $100 per day
    monthly: 2000.0,   // $2000 per month
    emergency: 500.0   // Emergency stop at $500/day
  };

  async checkRateLimit(
    userId: string,
    userRole: string,
    endpoint: string,
    estimatedCost: number = 0.02
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const userLimits = this.defaultLimits[userRole] || this.defaultLimits.user;

    // Check concurrent sessions
    const concurrentResult = this.checkConcurrentLimit(userId, userLimits.concurrent);
    if (!concurrentResult.allowed) {
      return concurrentResult;
    }

    // Check cost limits
    const costResult = await this.checkCostLimits(userId, estimatedCost);
    if (!costResult.allowed) {
      return costResult;
    }

    // Check rate limits (hourly, daily, monthly)
    const timeWindows = ['hourly', 'daily', 'monthly'] as const;
    
    for (const window of timeWindows) {
      const config = userLimits[window];
      const result = this.checkTimeWindow(userId, window, config, now);
      
      if (!result.allowed) {
        // Log rate limit exceeded
        await auditLogger.logEvent({
          event_type: 'rate_limit_exceeded',
          user_id: userId,
          user_role: userRole,
          details: {
            endpoint,
            window,
            limit: config.maxRequests,
            cost: estimatedCost,
            reason: result.reason
          },
          risk_level: 'medium',
          compliance_relevant: true,
          phi_involved: false
        });
        
        return result;
      }
    }

    // Record the request
    this.recordRequest(userId, now, estimatedCost);
    
    return {
      allowed: true,
      remaining: this.getRemainingRequests(userId, userLimits.hourly, now),
      resetTime: now + userLimits.hourly.windowMs,
      costIncurred: estimatedCost
    };
  }

  private checkConcurrentLimit(userId: string, maxConcurrent: number): RateLimitResult {
    const current = this.activeSessions.get(userId) || 0;
    
    if (current >= maxConcurrent) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000, // 1 minute retry
        retryAfter: 60,
        costIncurred: 0,
        reason: `Concurrent session limit exceeded (${current}/${maxConcurrent})`
      };
    }

    return {
      allowed: true,
      remaining: maxConcurrent - current,
      resetTime: Date.now(),
      costIncurred: 0
    };
  }

  private async checkCostLimits(userId: string, estimatedCost: number): Promise<RateLimitResult> {
    const userCost = this.getUserCostTracker(userId);
    const now = Date.now();
    
    // Reset daily costs if needed
    if (now - userCost.lastReset > 24 * 60 * 60 * 1000) {
      userCost.dailyCost = 0;
      userCost.lastReset = now;
    }

    // Check global emergency limit
    if (this.globalCosts.dailyCost + estimatedCost > this.costLimits.emergency) {
      await auditLogger.logEvent({
        event_type: 'security_violation',
        user_id: userId,
        details: {
          violation_type: 'emergency_cost_limit',
          daily_cost: this.globalCosts.dailyCost,
          estimated_cost: estimatedCost,
          limit: this.costLimits.emergency
        },
        risk_level: 'critical',
        compliance_relevant: true,
        phi_involved: false
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime: this.getNextDayReset(),
        costIncurred: 0,
        reason: 'Emergency cost limit exceeded'
      };
    }

    // Check user daily limit
    if (userCost.dailyCost + estimatedCost > this.costLimits.daily) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: this.getNextDayReset(),
        costIncurred: 0,
        reason: 'Daily cost limit exceeded'
      };
    }

    // Check user monthly limit
    if (userCost.monthlyCost + estimatedCost > this.costLimits.monthly) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: this.getNextMonthReset(),
        costIncurred: 0,
        reason: 'Monthly cost limit exceeded'
      };
    }

    return {
      allowed: true,
      remaining: Math.floor((this.costLimits.daily - userCost.dailyCost) / estimatedCost),
      resetTime: this.getNextDayReset(),
      costIncurred: estimatedCost
    };
  }

  private checkTimeWindow(
    userId: string,
    window: string,
    config: RateLimitConfig,
    now: number
  ): RateLimitResult {
    const userRequests = this.getUserRequests(userId);
    const windowRequests = userRequests.get(window) || [];
    
    // Filter out expired requests
    const validRequests = windowRequests.filter(timestamp => 
      now - timestamp < config.windowMs
    );
    
    // Update the stored requests
    userRequests.set(window, validRequests);

    if (validRequests.length >= config.maxRequests) {
      const oldestRequest = Math.min(...validRequests);
      const resetTime = oldestRequest + config.windowMs;
      
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil((resetTime - now) / 1000),
        costIncurred: 0,
        reason: `${window} limit exceeded (${validRequests.length}/${config.maxRequests})`
      };
    }

    return {
      allowed: true,
      remaining: config.maxRequests - validRequests.length,
      resetTime: now + config.windowMs,
      costIncurred: 0
    };
  }

  private recordRequest(userId: string, timestamp: number, cost: number): void {
    // Record timestamp for rate limiting
    const userRequests = this.getUserRequests(userId);
    ['hourly', 'daily', 'monthly'].forEach(window => {
      const requests = userRequests.get(window) || [];
      requests.push(timestamp);
      userRequests.set(window, requests);
    });

    // Record cost
    const userCost = this.getUserCostTracker(userId);
    userCost.dailyCost += cost;
    userCost.monthlyCost += cost;
    userCost.totalCost += cost;
    userCost.requestCount++;
    userCost.averageRequestCost = userCost.totalCost / userCost.requestCount;

    // Update global costs
    this.globalCosts.dailyCost += cost;
    this.globalCosts.monthlyCost += cost;
    this.globalCosts.totalCost += cost;
    this.globalCosts.requestCount++;
    this.globalCosts.averageRequestCost = this.globalCosts.totalCost / this.globalCosts.requestCount;
  }

  private getUserRequests(userId: string): Map<string, number[]> {
    if (!this.userRequests.has(userId)) {
      this.userRequests.set(userId, new Map());
    }
    return this.userRequests.get(userId)!;
  }

  private getUserCostTracker(userId: string): CostTracker {
    if (!this.userCosts.has(userId)) {
      this.userCosts.set(userId, {
        dailyCost: 0,
        monthlyCost: 0,
        totalCost: 0,
        lastReset: Date.now(),
        averageRequestCost: 0,
        requestCount: 0
      });
    }
    return this.userCosts.get(userId)!;
  }

  private getRemainingRequests(userId: string, config: RateLimitConfig, now: number): number {
    const userRequests = this.getUserRequests(userId);
    const requests = userRequests.get('hourly') || [];
    const validRequests = requests.filter(timestamp => now - timestamp < config.windowMs);
    return Math.max(0, config.maxRequests - validRequests.length);
  }

  private getNextDayReset(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  private getNextMonthReset(): number {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    return nextMonth.getTime();
  }

  async startSession(userId: string): Promise<void> {
    const current = this.activeSessions.get(userId) || 0;
    this.activeSessions.set(userId, current + 1);
  }

  async endSession(userId: string): Promise<void> {
    const current = this.activeSessions.get(userId) || 0;
    if (current > 0) {
      this.activeSessions.set(userId, current - 1);
    }
  }

  getCostSummary(): {
    global: CostTracker;
    topUsers: Array<{ userId: string; cost: CostTracker }>;
    alerts: string[];
  } {
    const alerts: string[] = [];
    
    // Check for cost alerts
    if (this.globalCosts.dailyCost > this.costLimits.daily * 0.8) {
      alerts.push('Daily cost approaching limit');
    }
    
    if (this.globalCosts.monthlyCost > this.costLimits.monthly * 0.8) {
      alerts.push('Monthly cost approaching limit');
    }

    // Get top users by cost
    const topUsers = Array.from(this.userCosts.entries())
      .map(([userId, cost]) => ({ userId, cost }))
      .sort((a, b) => b.cost.dailyCost - a.cost.dailyCost)
      .slice(0, 10);

    return {
      global: this.globalCosts,
      topUsers,
      alerts
    };
  }

  async resetUserLimits(userId: string): Promise<void> {
    this.userRequests.delete(userId);
    this.userCosts.delete(userId);
    this.activeSessions.delete(userId);
    
    await auditLogger.logEvent({
      event_type: 'data_modified',
      user_id: userId,
      details: {
        action: 'reset_rate_limits',
        admin_action: true
      },
      risk_level: 'medium',
      compliance_relevant: true,
      phi_involved: false
    });
  }

  getAnalytics(): {
    totalRequests: number;
    averageRequestsPerUser: number;
    costEfficiency: number;
    peakHours: number[];
    userDistribution: Record<string, number>;
  } {
    const totalRequests = this.globalCosts.requestCount;
    const uniqueUsers = this.userCosts.size;
    const averageRequestsPerUser = uniqueUsers > 0 ? totalRequests / uniqueUsers : 0;
    const costEfficiency = this.globalCosts.averageRequestCost;

    // Calculate peak hours (simplified)
    const peakHours = [9, 10, 11, 14, 15, 16]; // Typical business hours

    // User distribution by role (simplified)
    const userDistribution = {
      user: 0,
      provider: 0,
      admin: 0
    };

    return {
      totalRequests,
      averageRequestsPerUser,
      costEfficiency,
      peakHours,
      userDistribution
    };
  }
}

export const rateLimiterService = new RateLimiterService();