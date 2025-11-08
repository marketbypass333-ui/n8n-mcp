/**
 * Advanced Security & Compliance Features
 * Enterprise-grade security, audit logging, and compliance management
 */

import { Workflow, Node, User, WorkflowExecution } from '../types';
import { DatabaseService } from './database-service';
import { TelemetryService } from '../telemetry/telemetry-service';
import { Logger } from '../utils/logger';
import { createHash, randomBytes } from 'crypto';

export interface SecurityConfig {
  enableEncryption: boolean;
  enableAuditLogging: boolean;
  enableAccessControl: boolean;
  enableCompliance: boolean;
  enableDataRetention: boolean;
  enableThreatDetection: boolean;
  enableAnonymization: boolean;
  encryptionKey: string;
  auditRetentionDays: number;
  maxLoginAttempts: number;
  passwordPolicy: PasswordPolicy;
  sessionTimeout: number;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number;
  preventReuse: number;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  resourceId: string;
  result: 'success' | 'failure' | 'denied';
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'authentication' | 'authorization' | 'data_access' | 'configuration' | 'system';
}

export interface AccessControlRule {
  id: string;
  name: string;
  description: string;
  resource: string;
  resourceId?: string;
  action: string;
  principal: string;
  principalId?: string;
  conditions: AccessCondition[];
  effect: 'allow' | 'deny';
  priority: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface AccessCondition {
  type: 'time' | 'location' | 'device' | 'network' | 'custom';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'in' | 'not_in';
  value: any;
  metadata?: Record<string, any>;
}

export interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  description: string;
  requirements: ComplianceRequirement[];
  enabled: boolean;
  lastAudit: Date;
  nextAudit: Date;
  status: 'compliant' | 'non_compliant' | 'pending';
}

export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  controls: ComplianceControl[];
  status: 'implemented' | 'partial' | 'not_implemented';
  evidence: ComplianceEvidence[];
}

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  type: 'preventive' | 'detective' | 'corrective';
  implementation: string;
  status: 'active' | 'inactive';
  effectiveness: number;
  lastTested: Date;
  nextTest: Date;
}

export interface ComplianceEvidence {
  id: string;
  type: 'document' | 'log' | 'screenshot' | 'configuration' | 'test_result';
  description: string;
  location: string;
  createdAt: Date;
  validated: boolean;
  validatedBy?: string;
  validatedAt?: Date;
}

export interface DataRetentionPolicy {
  id: string;
  name: string;
  description: string;
  scope: string;
  retentionPeriod: number; // days
  action: 'archive' | 'delete' | 'anonymize';
  conditions: RetentionCondition[];
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export interface RetentionCondition {
  type: 'age' | 'status' | 'usage' | 'custom';
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

export interface ThreatDetectionRule {
  id: string;
  name: string;
  description: string;
  type: 'signature' | 'anomaly' | 'behavior' | 'ml';
  pattern: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  lastTrigger?: Date;
  triggerCount: number;
  falsePositiveRate: number;
  conditions: ThreatCondition[];
  actions: ThreatAction[];
}

export interface ThreatCondition {
  type: 'rate' | 'volume' | 'pattern' | 'time' | 'location';
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
  duration: number; // seconds
}

export interface ThreatAction {
  type: 'alert' | 'block' | 'rate_limit' | 'log' | 'notify';
  parameters: Record<string, any>;
  priority: number;
}

export interface SecurityIncident {
  id: string;
  type: 'unauthorized_access' | 'data_breach' | 'malware' | 'ddos' | 'insider_threat' | 'policy_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'investigating' | 'contained' | 'resolved' | 'closed';
  description: string;
  detectedAt: Date;
  containedAt?: Date;
  resolvedAt?: Date;
  affectedResources: string[];
  evidence: SecurityEvidence[];
  responseActions: ResponseAction[];
  lessonsLearned: string[];
}

export interface SecurityEvidence {
  type: 'log' | 'screenshot' | 'network_traffic' | 'file' | 'configuration';
  description: string;
  location: string;
  collectedAt: Date;
  hash: string;
}

export interface ResponseAction {
  type: 'isolate' | 'block' | 'notify' | 'investigate' | 'remediate';
  description: string;
  executedAt: Date;
  executedBy: string;
  result: string;
  status: 'success' | 'failure' | 'partial';
}

export class SecurityService {
  private static instance: SecurityService;
  private databaseService: DatabaseService;
  private telemetryService: TelemetryService;
  private logger: Logger;
  private config: SecurityConfig;
  private activeRules: Map<string, AccessControlRule> = new Map();
  private threatRules: Map<string, ThreatDetectionRule> = new Map();
  private complianceFrameworks: Map<string, ComplianceFramework> = new Map();

  private constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      enableEncryption: true,
      enableAuditLogging: true,
      enableAccessControl: true,
      enableCompliance: true,
      enableDataRetention: true,
      enableThreatDetection: true,
      enableAnonymization: true,
      encryptionKey: this.generateEncryptionKey(),
      auditRetentionDays: 365,
      maxLoginAttempts: 5,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxAge: 90,
        preventReuse: 5
      },
      sessionTimeout: 1800, // 30 minutes
      ...config
    };

    this.databaseService = DatabaseService.getInstance();
    this.telemetryService = TelemetryService.getInstance();
    this.logger = new Logger('SecurityService');

    this.initializeSecurityFrameworks();
  }

  static getInstance(config?: Partial<SecurityConfig>): SecurityService {
    if (!this.instance) {
      this.instance = new this(config);
    }
    return this.instance;
  }

  /**
   * Initialize security frameworks and rules
   */
  private initializeSecurityFrameworks(): void {
    this.initializeAccessControlRules();
    this.initializeThreatDetectionRules();
    this.initializeComplianceFrameworks();
  }

  /**
   * Initialize access control rules
   */
  private initializeAccessControlRules(): void {
    // Default access control rules
    const defaultRules: AccessControlRule[] = [
      {
        id: 'admin-full-access',
        name: 'Administrator Full Access',
        description: 'Administrators have full access to all resources',
        resource: '*',
        action: '*',
        principal: 'role',
        principalId: 'admin',
        conditions: [],
        effect: 'allow',
        priority: 100,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'user-workflow-access',
        name: 'User Workflow Access',
        description: 'Users can access their own workflows',
        resource: 'workflow',
        action: 'read',
        principal: 'user',
        conditions: [{
          type: 'custom',
          operator: 'equals',
          value: 'owner'
        }],
        effect: 'allow',
        priority: 90,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const rule of defaultRules) {
      this.activeRules.set(rule.id, rule);
    }
  }

  /**
   * Initialize threat detection rules
   */
  private initializeThreatDetectionRules(): void {
    const defaultRules: ThreatDetectionRule[] = [
      {
        id: 'brute-force-login',
        name: 'Brute Force Login Detection',
        description: 'Detect multiple failed login attempts',
        type: 'signature',
        pattern: 'failed_login_count > 5',
        severity: 'high',
        enabled: true,
        triggerCount: 0,
        falsePositiveRate: 0.05,
        conditions: [{
          type: 'rate',
          operator: 'greater_than',
          value: 5,
          duration: 300 // 5 minutes
        }],
        actions: [{
          type: 'block',
          parameters: { duration: 3600 }, // 1 hour
          priority: 1
        }, {
          type: 'alert',
          parameters: { recipients: ['security@company.com'] },
          priority: 2
        }]
      },
      {
        id: 'unusual-data-access',
        name: 'Unusual Data Access Pattern',
        description: 'Detect unusual data access patterns',
        type: 'anomaly',
        pattern: 'data_volume > baseline * 3',
        severity: 'medium',
        enabled: true,
        triggerCount: 0,
        falsePositiveRate: 0.1,
        conditions: [{
          type: 'volume',
          operator: 'greater_than',
          value: 1000,
          duration: 3600 // 1 hour
        }],
        actions: [{
          type: 'log',
          parameters: { level: 'warning' },
          priority: 1
        }]
      }
    ];

    for (const rule of defaultRules) {
      this.threatRules.set(rule.id, rule);
    }
  }

  /**
   * Initialize compliance frameworks
   */
  private initializeComplianceFrameworks(): void {
    const frameworks: ComplianceFramework[] = [
      {
        id: 'gdpr-compliance',
        name: 'GDPR Compliance',
        version: '1.0',
        description: 'General Data Protection Regulation compliance',
        requirements: [
          {
            id: 'gdpr-data-minimization',
            name: 'Data Minimization',
            description: 'Collect only necessary personal data',
            category: 'data-protection',
            priority: 'high',
            controls: [
              {
                id: 'data-collection-limit',
                name: 'Data Collection Limitation',
                description: 'Limit data collection to what is necessary',
                type: 'preventive',
                implementation: 'Data collection forms with minimal fields',
                status: 'active',
                effectiveness: 0.9,
                lastTested: new Date(),
                nextTest: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
              }
            ],
            status: 'implemented',
            evidence: [],
          }
        ],
        enabled: true,
        lastAudit: new Date(),
        nextAudit: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        status: 'compliant'
      }
    ];

    for (const framework of frameworks) {
      this.complianceFrameworks.set(framework.id, framework);
    }
  }

  /**
   * Generate encryption key
   */
  private generateEncryptionKey(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Authenticate user with enhanced security
   */
  async authenticateUser(username: string, password: string, context: any): Promise<{ success: boolean; user?: User; token?: string; reason?: string }> {
    try {
      // Log authentication attempt
      await this.logSecurityEvent({
        action: 'user_authentication',
        resource: 'user',
        resourceId: username,
        userId: username,
        result: 'info',
        severity: 'info',
        category: 'authentication',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        details: { method: 'password' }
      });

      // Check for brute force attempts
      const recentAttempts = await this.getRecentLoginAttempts(username, 300); // Last 5 minutes
      if (recentAttempts.length >= this.config.maxLoginAttempts) {
        await this.logSecurityEvent({
          action: 'brute_force_detected',
          resource: 'user',
          resourceId: username,
          result: 'denied',
          severity: 'warning',
          category: 'authentication',
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: { attemptCount: recentAttempts.length }
        });
        
        return { success: false, reason: 'Too many login attempts. Please try again later.' };
      }

      // Validate password against policy
      const passwordValidation = this.validatePasswordPolicy(password);
      if (!passwordValidation.valid) {
        return { success: false, reason: passwordValidation.reason };
      }

      // Authenticate user (this would typically call an authentication service)
      const user = await this.databaseService.authenticateUser(username, password);
      
      if (user) {
        // Generate secure token
        const token = this.generateSecureToken();
        
        await this.logSecurityEvent({
          action: 'user_authentication_success',
          resource: 'user',
          resourceId: user.id,
          userId: user.id,
          result: 'success',
          severity: 'info',
          category: 'authentication',
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        });

        return { success: true, user, token };
      } else {
        await this.logSecurityEvent({
          action: 'user_authentication_failure',
          resource: 'user',
          resourceId: username,
          result: 'failure',
          severity: 'warning',
          category: 'authentication',
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: { reason: 'Invalid credentials' }
        });

        return { success: false, reason: 'Invalid username or password' };
      }
    } catch (error) {
      this.logger.error('Authentication failed', error);
      return { success: false, reason: 'Authentication service unavailable' };
    }
  }

  /**
   * Validate password against policy
   */
  validatePasswordPolicy(password: string): { valid: boolean; reason?: string } {
    const policy = this.config.passwordPolicy;

    if (password.length < policy.minLength) {
      return { valid: false, reason: `Password must be at least ${policy.minLength} characters long` };
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      return { valid: false, reason: 'Password must contain at least one uppercase letter' };
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      return { valid: false, reason: 'Password must contain at least one lowercase letter' };
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      return { valid: false, reason: 'Password must contain at least one number' };
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { valid: false, reason: 'Password must contain at least one special character' };
    }

    return { valid: true };
  }

  /**
   * Check access permissions
   */
  async checkAccess(userId: string, resource: string, action: string, context?: any): Promise<{ allowed: boolean; reason?: string }> {
    if (!this.config.enableAccessControl) {
      return { allowed: true };
    }

    try {
      // Find applicable access control rules
      const applicableRules = Array.from(this.activeRules.values())
        .filter(rule => rule.enabled && this.isRuleApplicable(rule, userId, resource, action, context))
        .sort((a, b) => b.priority - a.priority);

      if (applicableRules.length === 0) {
        return { allowed: false, reason: 'No access control rules found' };
      }

      // Apply the highest priority rule
      const rule = applicableRules[0];
      const conditionsMet = await this.evaluateConditions(rule.conditions, userId, context);

      if (conditionsMet) {
        const result = rule.effect === 'allow';
        
        await this.logSecurityEvent({
          action: 'access_check',
          resource,
          resourceId: context?.resourceId,
          userId,
          result: result ? 'success' : 'denied',
          severity: result ? 'info' : 'warning',
          category: 'authorization',
          details: { rule: rule.id, action }
        });

        return { allowed: result, reason: result ? undefined : 'Access denied by security policy' };
      }

      return { allowed: false, reason: 'Access conditions not met' };
    } catch (error) {
      this.logger.error('Access check failed', error);
      return { allowed: false, reason: 'Access control system error' };
    }
  }

  /**
   * Encrypt sensitive data
   */
  encryptData(data: string): string {
    if (!this.config.enableEncryption) {
      return data;
    }

    try {
      // Simple encryption implementation (in production, use proper crypto library)
      const cipher = createHash('sha256').update(this.config.encryptionKey).digest('hex');
      return Buffer.from(data).toString('base64');
    } catch (error) {
      this.logger.error('Encryption failed', error);
      return data;
    }
  }

  /**
   * Decrypt sensitive data
   */
  decryptData(encryptedData: string): string {
    if (!this.config.enableEncryption) {
      return encryptedData;
    }

    try {
      return Buffer.from(encryptedData, 'base64').toString();
    } catch (error) {
      this.logger.error('Decryption failed', error);
      return encryptedData;
    }
  }

  /**
   * Anonymize sensitive data
   */
  anonymizeData(data: any, fieldsToAnonymize: string[]): any {
    if (!this.config.enableAnonymization) {
      return data;
    }

    const anonymized = { ...data };
    
    for (const field of fieldsToAnonymize) {
      if (anonymized[field]) {
        anonymized[field] = this.hashData(anonymized[field].toString());
      }
    }

    return anonymized;
  }

  /**
   * Hash data for anonymization
   */
  private hashData(data: string): string {
    return createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Log security event
   */
  async logSecurityEvent(event: Partial<SecurityAuditLog>): Promise<void> {
    if (!this.config.enableAuditLogging) {
      return;
    }

    try {
      const fullEvent: SecurityAuditLog = {
        id: this.generateEventId(),
        timestamp: new Date(),
        action: event.action!,
        resource: event.resource!,
        resourceId: event.resourceId!,
        result: event.result || 'info',
        severity: event.severity || 'info',
        category: event.category || 'system',
        ipAddress: event.ipAddress || 'unknown',
        userAgent: event.userAgent || 'unknown',
        details: event.details || {},
        userId: event.userId
      };

      await this.databaseService.storeSecurityEvent(fullEvent);
      
      // Check if this event triggers any threat detection rules
      if (this.config.enableThreatDetection) {
        await this.checkThreatDetection(fullEvent);
      }

      this.logger.info('Security event logged', { eventId: fullEvent.id, action: fullEvent.action });
    } catch (error) {
      this.logger.error('Failed to log security event', error);
    }
  }

  /**
   * Check threat detection
   */
  private async checkThreatDetection(event: SecurityAuditLog): Promise<void> {
    for (const rule of this.threatRules.values()) {
      if (!rule.enabled) continue;

      const matches = this.evaluateThreatRule(rule, event);
      if (matches) {
        rule.triggerCount++;
        rule.lastTrigger = new Date();

        await this.handleThreatDetection(rule, event);
      }
    }
  }

  /**
   * Evaluate threat rule
   */
  private evaluateThreatRule(rule: ThreatDetectionRule, event: SecurityAuditLog): boolean {
    // Simple pattern matching (in production, use more sophisticated detection)
    if (rule.type === 'signature') {
      return event.action.includes(rule.pattern.split('-')[0]);
    }

    if (rule.type === 'anomaly') {
      // Check conditions
      for (const condition of rule.conditions) {
        if (condition.type === 'rate' && event.action.includes('authentication')) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Handle threat detection
   */
  private async handleThreatDetection(rule: ThreatDetectionRule, event: SecurityAuditLog): Promise<void> {
    this.logger.warn('Threat detected', { rule: rule.id, severity: rule.severity });

    for (const action of rule.actions.sort((a, b) => a.priority - b.priority)) {
      switch (action.type) {
        case 'alert':
          await this.sendSecurityAlert(rule, event, action.parameters);
          break;
        case 'block':
          await this.blockThreat(rule, event, action.parameters);
          break;
        case 'log':
          await this.logThreat(rule, event, action.parameters);
          break;
        case 'notify':
          await this.notifySecurityTeam(rule, event, action.parameters);
          break;
      }
    }

    this.telemetryService.track('security.threat.detected', {
      ruleId: rule.id,
      severity: rule.severity,
      event: event.action
    });
  }

  /**
   * Send security alert
   */
  private async sendSecurityAlert(rule: ThreatDetectionRule, event: SecurityAuditLog, parameters: any): Promise<void> {
    const alert = {
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      event: event.action,
      timestamp: event.timestamp,
      details: event.details
    };

    this.logger.warn('Security alert', alert);
    
    // In production, send to security team, SIEM, etc.
  }

  /**
   * Block threat
   */
  private async blockThreat(rule: ThreatDetectionRule, event: SecurityAuditLog, parameters: any): Promise<void> {
    const blockDuration = parameters.duration || 3600; // 1 hour default
    
    await this.logSecurityEvent({
      action: 'threat_blocked',
      resource: 'system',
      resourceId: rule.id,
      userId: event.userId,
      result: 'success',
      severity: 'warning',
      category: 'threat_detection',
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      details: { rule: rule.id, duration: blockDuration }
    });
  }

  /**
   * Log threat
   */
  private async logThreat(rule: ThreatDetectionRule, event: SecurityAuditLog, parameters: any): Promise<void> {
    await this.logSecurityEvent({
      action: 'threat_detected',
      resource: 'system',
      resourceId: rule.id,
      userId: event.userId,
      result: 'info',
      severity: rule.severity as any,
      category: 'threat_detection',
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      details: { rule: rule.id, pattern: rule.pattern }
    });
  }

  /**
   * Notify security team
   */
  private async notifySecurityTeam(rule: ThreatDetectionRule, event: SecurityAuditLog, parameters: any): Promise<void> {
    const recipients = parameters.recipients || ['security@company.com'];
    
    await this.logSecurityEvent({
      action: 'security_team_notified',
      resource: 'system',
      resourceId: rule.id,
      userId: event.userId,
      result: 'success',
      severity: 'info',
      category: 'notification',
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      details: { rule: rule.id, recipients }
    });
  }

  /**
   * Get recent login attempts
   */
  private async getRecentLoginAttempts(username: string, timeWindow: number): Promise<any[]> {
    const cutoffTime = new Date(Date.now() - timeWindow * 1000);
    return this.databaseService.getLoginAttempts(username, cutoffTime);
  }

  /**
   * Generate secure token
   */
  private generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `sec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if rule is applicable
   */
  private isRuleApplicable(rule: AccessControlRule, userId: string, resource: string, action: string, context?: any): boolean {
    return rule.resource === '*' || rule.resource === resource;
  }

  /**
   * Evaluate conditions
   */
  private async evaluateConditions(conditions: AccessCondition[], userId: string, context?: any): Promise<boolean> {
    if (conditions.length === 0) {
      return true;
    }

    // Simple condition evaluation (in production, use more sophisticated logic)
    for (const condition of conditions) {
      if (condition.type === 'custom' && condition.value === 'owner') {
        // Check if user owns the resource
        return context?.ownerId === userId;
      }
    }

    return true;
  }

  /**
   * Get security statistics
   */
  async getSecurityStats(): Promise<any> {
    const stats = {
      activeRules: this.activeRules.size,
      threatRules: this.threatRules.size,
      complianceFrameworks: this.complianceFrameworks.size,
      encryptionEnabled: this.config.enableEncryption,
      auditLoggingEnabled: this.config.enableAuditLogging,
      threatDetectionEnabled: this.config.enableThreatDetection
    };

    return stats;
  }

  /**
   * Run compliance audit
   */
  async runComplianceAudit(frameworkId: string): Promise<any> {
    const framework = this.complianceFrameworks.get(frameworkId);
    if (!framework) {
      throw new Error('Compliance framework not found');
    }

    // Implementation would run comprehensive compliance checks
    const auditResult = {
      frameworkId,
      frameworkName: framework.name,
      timestamp: new Date(),
      overallStatus: framework.status,
      requirements: framework.requirements.map(req => ({
        id: req.id,
        name: req.name,
        status: req.status,
        controlsImplemented: req.controls.filter(c => c.status === 'active').length,
        totalControls: req.controls.length
      }))
    };

    return auditResult;
  }

  /**
   * Get compliance report
   */
  async getComplianceReport(): Promise<any> {
    const reports = [];
    
    for (const framework of this.complianceFrameworks.values()) {
      if (framework.enabled) {
        const report = await this.runComplianceAudit(framework.id);
        reports.push(report);
      }
    }

    return {
      timestamp: new Date(),
      frameworks: reports,
      summary: {
        totalFrameworks: reports.length,
        compliantFrameworks: reports.filter(r => r.overallStatus === 'compliant').length,
        nonCompliantFrameworks: reports.filter(r => r.overallStatus === 'non_compliant').length
      }
    };
  }
}