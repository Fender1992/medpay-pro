import { NextRequest, NextResponse } from 'next/server';
import { auditLogger } from './audit-logger';
import { rateLimiterService } from './rate-limiter';

export interface SecurityConfig {
  enableCSRF: boolean;
  enableXSS: boolean;
  enableSQLInjection: boolean;
  enableRateLimit: boolean;
  enableIPWhitelist: boolean;
  allowedOrigins: string[];
  maxRequestSize: number;
  sessionTimeout: number;
}

export interface SecurityViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  blocked: boolean;
  evidence: string;
}

export interface SecurityResult {
  allowed: boolean;
  violations: SecurityViolation[];
  sanitizedInput?: any;
  securityHeaders: Record<string, string>;
}

class SecurityMiddleware {
  private readonly config: SecurityConfig = {
    enableCSRF: true,
    enableXSS: true,
    enableSQLInjection: true,
    enableRateLimit: true,
    enableIPWhitelist: false,
    allowedOrigins: ['https://localhost:3000', 'https://medchat-ai-pro.vercel.app'],
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    sessionTimeout: 30 * 60 * 1000 // 30 minutes
  };

  private readonly maliciousPatterns = {
    xss: [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload=/gi,
      /onerror=/gi,
      /onclick=/gi,
      /onmouseover=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>.*?<\/embed>/gi,
      /<link[^>]*>/gi,
      /<meta[^>]*>/gi
    ],
    sqlInjection: [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
      /(\b(UNION|JOIN|WHERE|ORDER BY|GROUP BY|HAVING)\b)/gi,
      /(\b(AND|OR|NOT|LIKE|IN|BETWEEN)\b.*['"].*['"])/gi,
      /(['"].*;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE))/gi,
      /(--|\#|\/\*|\*\/)/gi,
      /(\b(WAITFOR|DELAY)\b)/gi,
      /(\b(CHAR|NCHAR|VARCHAR|NVARCHAR|CAST|CONVERT)\b\s*\()/gi
    ],
    pathTraversal: [
      /\.\.\//gi,
      /\.\.\\/gi,
      /\.\./gi,
      /~\//gi,
      /\/etc\//gi,
      /\/proc\//gi,
      /\/sys\//gi,
      /\/dev\//gi,
      /\/windows\//gi,
      /\/system32\//gi
    ],
    commandInjection: [
      /(\b(cat|ls|pwd|whoami|id|ps|netstat|ifconfig|ipconfig|ping|telnet|ssh|ftp|wget|curl|nc|ncat|bash|sh|cmd|powershell|wmic|reg|net|sc|tasklist|taskkill)\b)/gi,
      /[;&|`$(){}]/gi,
      /\$\{.*\}/gi,
      /\$\(.*\)/gi,
      /`.*`/gi
    ],
    ldapInjection: [
      /\*\)/gi,
      /\(\|/gi,
      /\(\&/gi,
      /\(\!/gi,
      /\)\(/gi,
      /\*\(/gi,
      /\)\*/gi
    ]
  };

  private readonly suspiciousUserAgents = [
    'sqlmap',
    'nikto',
    'nmap',
    'nessus',
    'burp',
    'w3af',
    'havij',
    'acunetix',
    'webinspect',
    'appscan'
  ];

  private readonly securityHeaders = {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
    'X-Permitted-Cross-Domain-Policies': 'none'
  };

  async validateRequest(request: NextRequest): Promise<SecurityResult> {
    const violations: SecurityViolation[] = [];
    const url = new URL(request.url);
    const userAgent = request.headers.get('user-agent') || '';
    const origin = request.headers.get('origin') || '';
    const referer = request.headers.get('referer') || '';
    const clientIP = this.getClientIP(request);

    // Check request size
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > this.config.maxRequestSize) {
      violations.push({
        type: 'request_size',
        severity: 'high',
        description: 'Request size exceeds maximum allowed',
        blocked: true,
        evidence: `Size: ${contentLength} bytes`
      });
    }

    // Check suspicious user agents
    if (this.isSuspiciousUserAgent(userAgent)) {
      violations.push({
        type: 'suspicious_user_agent',
        severity: 'high',
        description: 'Suspicious user agent detected',
        blocked: true,
        evidence: userAgent
      });
    }

    // Check origin and referer
    if (this.config.enableCSRF && !this.isValidOrigin(origin, referer)) {
      violations.push({
        type: 'csrf',
        severity: 'high',
        description: 'Invalid origin or referer',
        blocked: true,
        evidence: `Origin: ${origin}, Referer: ${referer}`
      });
    }

    // Parse request body for analysis
    let requestBody: any = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        const body = await request.text();
        if (body) {
          requestBody = this.parseRequestBody(body, request.headers.get('content-type'));
          
          // Check for malicious patterns in body
          const bodyViolations = this.scanForMaliciousPatterns(body);
          violations.push(...bodyViolations);
        }
      } catch (error) {
        violations.push({
          type: 'malformed_request',
          severity: 'medium',
          description: 'Unable to parse request body',
          blocked: false,
          evidence: 'Body parsing failed'
        });
      }
    }

    // Check query parameters
    const queryViolations = this.scanForMaliciousPatterns(url.searchParams.toString());
    violations.push(...queryViolations);

    // Check path parameters
    const pathViolations = this.scanForMaliciousPatterns(url.pathname);
    violations.push(...pathViolations);

    // Log security violations
    if (violations.length > 0) {
      await auditLogger.logEvent({
        event_type: 'security_violation',
        details: {
          url: url.pathname,
          method: request.method,
          client_ip: clientIP,
          user_agent: userAgent,
          violations: violations.map(v => ({
            type: v.type,
            severity: v.severity,
            blocked: v.blocked
          }))
        },
        ip_address: clientIP,
        user_agent: userAgent,
        risk_level: violations.some(v => v.severity === 'critical') ? 'critical' : 'high',
        compliance_relevant: true,
        phi_involved: false
      });
    }

    const blocked = violations.some(v => v.blocked);
    const sanitizedInput = requestBody ? this.sanitizeInput(requestBody) : null;

    return {
      allowed: !blocked,
      violations,
      sanitizedInput,
      securityHeaders: this.securityHeaders
    };
  }

  private scanForMaliciousPatterns(input: string): SecurityViolation[] {
    const violations: SecurityViolation[] = [];
    
    if (!input) return violations;

    // Check for XSS patterns
    if (this.config.enableXSS) {
      for (const pattern of this.maliciousPatterns.xss) {
        const matches = input.match(pattern);
        if (matches) {
          violations.push({
            type: 'xss',
            severity: 'high',
            description: 'Cross-site scripting attempt detected',
            blocked: true,
            evidence: matches[0].substring(0, 100)
          });
        }
      }
    }

    // Check for SQL injection patterns
    if (this.config.enableSQLInjection) {
      for (const pattern of this.maliciousPatterns.sqlInjection) {
        const matches = input.match(pattern);
        if (matches) {
          violations.push({
            type: 'sql_injection',
            severity: 'critical',
            description: 'SQL injection attempt detected',
            blocked: true,
            evidence: matches[0].substring(0, 100)
          });
        }
      }
    }

    // Check for path traversal
    for (const pattern of this.maliciousPatterns.pathTraversal) {
      const matches = input.match(pattern);
      if (matches) {
        violations.push({
          type: 'path_traversal',
          severity: 'high',
          description: 'Path traversal attempt detected',
          blocked: true,
          evidence: matches[0].substring(0, 100)
        });
      }
    }

    // Check for command injection
    for (const pattern of this.maliciousPatterns.commandInjection) {
      const matches = input.match(pattern);
      if (matches) {
        violations.push({
          type: 'command_injection',
          severity: 'critical',
          description: 'Command injection attempt detected',
          blocked: true,
          evidence: matches[0].substring(0, 100)
        });
      }
    }

    // Check for LDAP injection
    for (const pattern of this.maliciousPatterns.ldapInjection) {
      const matches = input.match(pattern);
      if (matches) {
        violations.push({
          type: 'ldap_injection',
          severity: 'high',
          description: 'LDAP injection attempt detected',
          blocked: true,
          evidence: matches[0].substring(0, 100)
        });
      }
    }

    return violations;
  }

  private sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeString(input);
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[this.sanitizeString(key)] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }

  private sanitizeString(input: string): string {
    if (!input) return input;
    
    // Remove or escape dangerous characters
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[;]/g, '') // Remove semicolons
      .replace(/[\\]/g, '') // Remove backslashes
      .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
      .trim();
  }

  private parseRequestBody(body: string, contentType: string | null): any {
    if (!contentType) return body;
    
    try {
      if (contentType.includes('application/json')) {
        return JSON.parse(body);
      }
      
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(body);
        const result: any = {};
        for (const [key, value] of params.entries()) {
          result[key] = value;
        }
        return result;
      }
      
      return body;
    } catch {
      return body;
    }
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const lowerUA = userAgent.toLowerCase();
    return this.suspiciousUserAgents.some(suspicious => 
      lowerUA.includes(suspicious.toLowerCase())
    );
  }

  private isValidOrigin(origin: string, referer: string): boolean {
    if (!origin && !referer) return true; // Allow for direct API calls
    
    const checkOrigin = origin || referer;
    
    // Check against allowed origins
    return this.config.allowedOrigins.some(allowed => 
      checkOrigin.startsWith(allowed)
    );
  }

  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const clientIP = request.headers.get('x-client-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    if (clientIP) {
      return clientIP;
    }
    
    return 'unknown';
  }

  async createSecurityResponse(
    result: SecurityResult,
    originalResponse?: NextResponse
  ): Promise<NextResponse> {
    const response = originalResponse || new NextResponse();
    
    // Add security headers
    Object.entries(result.securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    // Add custom headers for security info
    response.headers.set('X-Security-Scan', 'completed');
    response.headers.set('X-Violations-Count', result.violations.length.toString());
    
    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: 'Security violation detected',
          message: 'Request blocked due to security policy',
          violations: result.violations.map(v => ({
            type: v.type,
            description: v.description
          }))
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...result.securityHeaders
          }
        }
      );
    }
    
    return response;
  }

  getSecurityMetrics(): {
    totalRequests: number;
    blockedRequests: number;
    violationsByType: Record<string, number>;
    topThreats: Array<{ type: string; count: number }>;
    securityScore: number;
  } {
    // This would typically be stored in a database or cache
    // For now, returning mock data
    return {
      totalRequests: 1000,
      blockedRequests: 25,
      violationsByType: {
        xss: 10,
        sql_injection: 5,
        csrf: 7,
        path_traversal: 3
      },
      topThreats: [
        { type: 'xss', count: 10 },
        { type: 'csrf', count: 7 },
        { type: 'sql_injection', count: 5 }
      ],
      securityScore: 97.5
    };
  }
}

export const securityMiddleware = new SecurityMiddleware();

// Middleware wrapper for Next.js
export function withSecurity(handler: any) {
  return async (request: NextRequest) => {
    const securityResult = await securityMiddleware.validateRequest(request);
    
    if (!securityResult.allowed) {
      return securityMiddleware.createSecurityResponse(securityResult);
    }
    
    // Continue with original handler
    const response = await handler(request);
    return securityMiddleware.createSecurityResponse(securityResult, response);
  };
}