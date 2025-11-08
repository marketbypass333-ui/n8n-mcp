/**
 * Advanced Features Integration
 * Main integration module for all advanced features
 */

import { WorkflowIntelligenceService } from './services/workflow-intelligence-service';
import { PerformanceMonitoringService } from './services/performance-monitoring-service';
import { RecommendationService } from './services/recommendation-service';
import { CollaborationService } from './services/collaboration-service';
import { SecurityService } from './services/security-service';
import { MultiCloudService } from './services/multi-cloud-service';
import { AIService } from './services/ai-service';
import { DatabaseService } from './services/database-service';
import { TelemetryService } from './telemetry/telemetry-service';
import { Logger } from './utils/logger';
import { Workflow, Node, WorkflowExecution } from './types';

export interface AdvancedFeaturesConfig {
  enableIntelligence: boolean;
  enablePerformanceMonitoring: boolean;
  enableRecommendations: boolean;
  enableCollaboration: boolean;
  enableSecurity: boolean;
  enableMultiCloud: boolean;
  enableAI: boolean;
}

export interface AdvancedFeatures {
  intelligence: WorkflowIntelligenceService;
  performance: PerformanceMonitoringService;
  recommendations: RecommendationService;
  collaboration: CollaborationService;
  security: SecurityService;
  multiCloud: MultiCloudService;
  ai: AIService;
}

/**
 * Initialize all advanced features
 */
export function initializeAdvancedFeatures(config: Partial<AdvancedFeaturesConfig> = {}): AdvancedFeatures {
  const fullConfig: AdvancedFeaturesConfig = {
    enableIntelligence: true,
    enablePerformanceMonitoring: true,
    enableRecommendations: true,
    enableCollaboration: true,
    enableSecurity: true,
    enableMultiCloud: true,
    enableAI: true,
    ...config
  };

  const services: Partial<AdvancedFeatures> = {};

  // Initialize services based on configuration
  if (fullConfig.enableIntelligence) {
    services.intelligence = WorkflowIntelligenceService.getInstance();
  }

  if (fullConfig.enablePerformanceMonitoring) {
    services.performance = PerformanceMonitoringService.getInstance();
  }

  if (fullConfig.enableRecommendations) {
    services.recommendations = RecommendationService.getInstance();
  }

  if (fullConfig.enableCollaboration) {
    services.collaboration = CollaborationService.getInstance();
  }

  if (fullConfig.enableSecurity) {
    services.security = SecurityService.getInstance();
  }

  if (fullConfig.enableMultiCloud) {
    services.multiCloud = MultiCloudService.getInstance();
  }

  if (fullConfig.enableAI) {
    services.ai = AIService.getInstance();
  }

  return services as AdvancedFeatures;
}

/**
 * Enhanced workflow analysis with all advanced features
 */
export async function analyzeWorkflowEnhanced(
  workflow: Workflow,
  features: AdvancedFeatures,
  context?: any
): Promise<{
  intelligence: any;
  performance: any;
  recommendations: any;
  security: any;
}> {
  const results = {
    intelligence: null,
    performance: null,
    recommendations: null,
    security: null
  };

  try {
    // Run intelligence analysis
    if (features.intelligence) {
      results.intelligence = await features.intelligence.analyzeWorkflow(workflow);
    }

    // Run performance analysis
    if (features.performance) {
      results.performance = await features.performance.analyzePerformance(workflow.id);
    }

    // Generate recommendations
    if (features.recommendations) {
      const recommendationContext = {
        workflow,
        executionHistory: context?.executionHistory,
        similarWorkflows: context?.similarWorkflows,
        userPreferences: context?.userPreferences
      };
      results.recommendations = await features.recommendations.generateRecommendations(recommendationContext);
    }

    // Security analysis
    if (features.security) {
      results.security = await features.security.getSecurityStats();
    }

  } catch (error) {
    const logger = new Logger('AdvancedFeatures');
    logger.error('Enhanced workflow analysis failed', error);
  }

  return results;
}

/**
 * Real-time monitoring and alerting
 */
export function startRealTimeMonitoring(features: AdvancedFeatures): void {
  if (features.performance) {
    // Performance monitoring is started automatically in the service constructor
  }

  if (features.collaboration) {
    // Collaboration real-time updates are handled by the event system
  }

  if (features.security) {
    // Security monitoring is handled by the security service
  }

  if (features.multiCloud) {
    // Multi-cloud monitoring can be started here
  }
}

/**
 * Get comprehensive system health
 */
export async function getSystemHealth(features: AdvancedFeatures): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, any>;
  metrics: Record<string, any>;
  alerts: string[];
}> {
  const health = {
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    services: {},
    metrics: {},
    alerts: []
  };

  try {
    // Check each service
    if (features.performance) {
      health.services.performance = features.performance.getRealTimeMetrics();
    }

    if (features.collaboration) {
      health.services.collaboration = features.collaboration.getRealTimeMetrics();
    }

    if (features.security) {
      health.services.security = await features.security.getSecurityStats();
    }

    if (features.multiCloud) {
      health.services.multiCloud = {
        providers: features.multiCloud.getCloudProviders().length,
        deployments: features.multiCloud.getDeployments().length,
        strategies: features.multiCloud.getMultiCloudStrategies().length
      };
    }

    // Determine overall status
    const serviceStatuses = Object.values(health.services).map((service: any) => {
      if (service.activeWorkflows !== undefined) return service.activeWorkflows > 0 ? 'healthy' : 'degraded';
      if (service.activeSessions !== undefined) return service.activeSessions >= 0 ? 'healthy' : 'degraded';
      return 'healthy';
    });

    if (serviceStatuses.includes('unhealthy')) {
      health.status = 'unhealthy';
    } else if (serviceStatuses.includes('degraded')) {
      health.status = 'degraded';
    }

  } catch (error) {
    health.status = 'unhealthy';
    health.alerts.push('System health check failed');
  }

  return health;
}

/**
 * Export for use in other modules
 */
export {
  WorkflowIntelligenceService,
  PerformanceMonitoringService,
  RecommendationService,
  CollaborationService,
  SecurityService,
  MultiCloudService,
  AIService
};