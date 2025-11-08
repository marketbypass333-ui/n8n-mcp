/**
 * Smart Workflow Recommendation System
 * AI-powered workflow recommendations and optimization suggestions
 */

import { Workflow, Node, WorkflowExecution } from '../types';
import { AIService } from './ai-service';
import { DatabaseService } from './database-service';
import { TelemetryService } from '../telemetry/telemetry-service';
import { Logger } from '../utils/logger';
import { LRUCache } from 'lru-cache';

export interface RecommendationConfig {
  enableAIRecommendations: boolean;
  enablePatternBasedRecommendations: boolean;
  enableHistoricalRecommendations: boolean;
  enableCollaborativeRecommendations: boolean;
  cacheSize: number;
  cacheTTL: number;
  maxRecommendations: number;
  minConfidence: number;
}

export interface WorkflowRecommendation {
  id: string;
  type: 'optimization' | 'automation' | 'integration' | 'security' | 'performance' | 'usability';
  title: string;
  description: string;
  confidence: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  implementation: string;
  affectedNodes: string[];
  estimatedBenefits: {
    timeSaving?: number;
    costReduction?: number;
    performanceImprovement?: number;
    securityEnhancement?: number;
  };
  prerequisites: string[];
  relatedRecommendations: string[];
  category: string;
  tags: string[];
}

export interface RecommendationContext {
  workflow: Workflow;
  executionHistory?: WorkflowExecution[];
  similarWorkflows?: Workflow[];
  userPreferences?: UserPreferences;
  environment?: string;
  constraints?: string[];
}

export interface UserPreferences {
  preferredNodeTypes: string[];
  preferredIntegrations: string[];
  complexityPreference: 'simple' | 'moderate' | 'advanced';
  automationLevel: 'manual' | 'semi-automated' | 'fully-automated';
  securityLevel: 'basic' | 'enhanced' | 'maximum';
  performancePriority: 'speed' | 'memory' | 'reliability' | 'balanced';
}

export interface RecommendationEngine {
  name: string;
  version: string;
  enabled: boolean;
  accuracy: number;
  lastUpdated: Date;
}

export class RecommendationService {
  private static instance: RecommendationService;
  private aiService: AIService;
  private databaseService: DatabaseService;
  private telemetryService: TelemetryService;
  private logger: Logger;
  private config: RecommendationConfig;
  private cache: LRUCache<string, WorkflowRecommendation[]>;
  private engines: RecommendationEngine[] = [];

  private constructor(config: Partial<RecommendationConfig> = {}) {
    this.config = {
      enableAIRecommendations: true,
      enablePatternBasedRecommendations: true,
      enableHistoricalRecommendations: true,
      enableCollaborativeRecommendations: true,
      cacheSize: 1000,
      cacheTTL: 3600000, // 1 hour
      maxRecommendations: 10,
      minConfidence: 0.6,
      ...config
    };

    this.aiService = AIService.getInstance();
    this.databaseService = DatabaseService.getInstance();
    this.telemetryService = TelemetryService.getInstance();
    this.logger = new Logger('RecommendationService');

    this.cache = new LRUCache({
      max: this.config.cacheSize,
      ttl: this.config.cacheTTL
    });

    this.initializeEngines();
  }

  static getInstance(config?: Partial<RecommendationConfig>): RecommendationService {
    if (!this.instance) {
      this.instance = new this(config);
    }
    return this.instance;
  }

  /**
   * Initialize recommendation engines
   */
  private initializeEngines(): void {
    this.engines = [
      {
        name: 'AI Engine',
        version: '1.0.0',
        enabled: this.config.enableAIRecommendations,
        accuracy: 0.85,
        lastUpdated: new Date()
      },
      {
        name: 'Pattern Engine',
        version: '1.0.0',
        enabled: this.config.enablePatternBasedRecommendations,
        accuracy: 0.78,
        lastUpdated: new Date()
      },
      {
        name: 'Historical Engine',
        version: '1.0.0',
        enabled: this.config.enableHistoricalRecommendations,
        accuracy: 0.72,
        lastUpdated: new Date()
      },
      {
        name: 'Collaborative Engine',
        version: '1.0.0',
        enabled: this.config.enableCollaborativeRecommendations,
        accuracy: 0.69,
        lastUpdated: new Date()
      }
    ];
  }

  /**
   * Generate workflow recommendations
   */
  async generateRecommendations(context: RecommendationContext): Promise<WorkflowRecommendation[]> {
    const cacheKey = this.generateCacheKey(context);
    
    if (this.cache.has(cacheKey)) {
      return this.filterAndSortRecommendations(this.cache.get(cacheKey)!);
    }

    try {
      this.logger.info(`Generating recommendations for workflow: ${context.workflow.name || context.workflow.id}`);

      const allRecommendations: WorkflowRecommendation[] = [];

      // AI-based recommendations
      if (this.config.enableAIRecommendations) {
        const aiRecommendations = await this.generateAIRecommendations(context);
        allRecommendations.push(...aiRecommendations);
      }

      // Pattern-based recommendations
      if (this.config.enablePatternBasedRecommendations) {
        const patternRecommendations = await this.generatePatternRecommendations(context);
        allRecommendations.push(...patternRecommendations);
      }

      // Historical recommendations
      if (this.config.enableHistoricalRecommendations) {
        const historicalRecommendations = await this.generateHistoricalRecommendations(context);
        allRecommendations.push(...historicalRecommendations);
      }

      // Collaborative recommendations
      if (this.config.enableCollaborativeRecommendations) {
        const collaborativeRecommendations = await this.generateCollaborativeRecommendations(context);
        allRecommendations.push(...collaborativeRecommendations);
      }

      // Remove duplicates and filter by confidence
      const uniqueRecommendations = this.removeDuplicateRecommendations(allRecommendations);
      const filteredRecommendations = this.filterAndSortRecommendations(uniqueRecommendations);

      // Cache results
      this.cache.set(cacheKey, filteredRecommendations);

      this.telemetryService.track('recommendations.generated', {
        workflowId: context.workflow.id,
        recommendationCount: filteredRecommendations.length,
        enginesUsed: this.engines.filter(e => e.enabled).map(e => e.name)
      });

      return filteredRecommendations;
    } catch (error) {
      this.logger.error('Failed to generate recommendations', error);
      return [];
    }
  }

  /**
   * Generate AI-powered recommendations
   */
  private async generateAIRecommendations(context: RecommendationContext): Promise<WorkflowRecommendation[]> {
    try {
      const suggestions = await this.aiService.optimizeWorkflow(context.workflow);
      
      return suggestions.map((suggestion, index) => ({
        id: `ai-rec-${index}`,
        type: suggestion.type as any,
        title: suggestion.title,
        description: suggestion.description,
        confidence: suggestion.confidence || 0.8,
        priority: this.mapConfidenceToPriority(suggestion.confidence || 0.8),
        impact: this.mapConfidenceToImpact(suggestion.confidence || 0.8),
        effort: 'medium',
        implementation: suggestion.implementation,
        affectedNodes: suggestion.affectedNodes || [],
        estimatedBenefits: {
          performanceImprovement: suggestion.estimatedImprovement
        },
        prerequisites: [],
        relatedRecommendations: [],
        category: 'AI-Optimized',
        tags: ['ai', 'optimization', 'intelligent']
      }));
    } catch (error) {
      this.logger.error('Failed to generate AI recommendations', error);
      return [];
    }
  }

  /**
   * Generate pattern-based recommendations
   */
  private async generatePatternRecommendations(context: RecommendationContext): Promise<WorkflowRecommendation[]> {
    const recommendations: WorkflowRecommendation[] = [];
    const patterns = this.analyzeWorkflowPatterns(context.workflow);

    // Anti-pattern detection
    const antiPatterns = this.detectAntiPatterns(context.workflow);
    for (const [index, antiPattern] of antiPatterns.entries()) {
      recommendations.push({
        id: `pattern-anti-${index}`,
        type: 'optimization',
        title: `Remove ${antiPattern.name} Anti-pattern`,
        description: antiPattern.description,
        confidence: 0.9,
        priority: antiPattern.severity === 'high' ? 'high' : 'medium',
        impact: antiPattern.severity === 'high' ? 'high' : 'medium',
        effort: 'medium',
        implementation: antiPattern.solution,
        affectedNodes: antiPattern.affectedNodes,
        estimatedBenefits: {
          performanceImprovement: 25,
          reliabilityImprovement: 30
        },
        prerequisites: [],
        relatedRecommendations: [],
        category: 'Pattern-Based',
        tags: ['anti-pattern', 'optimization', 'best-practice']
      });
    }

    // Pattern opportunities
    const opportunities = this.identifyPatternOpportunities(context.workflow);
    for (const [index, opportunity] of opportunities.entries()) {
      recommendations.push({
        id: `pattern-opp-${index}`,
        type: opportunity.type as any,
        title: opportunity.title,
        description: opportunity.description,
        confidence: 0.75,
        priority: 'medium',
        impact: 'medium',
        effort: 'low',
        implementation: opportunity.implementation,
        affectedNodes: opportunity.affectedNodes,
        estimatedBenefits: opportunity.benefits,
        prerequisites: [],
        relatedRecommendations: [],
        category: 'Pattern-Based',
        tags: ['pattern', 'opportunity', 'improvement']
      });
    }

    return recommendations;
  }

  /**
   * Generate historical recommendations
   */
  private async generateHistoricalRecommendations(context: RecommendationContext): Promise<WorkflowRecommendation[]> {
    const recommendations: WorkflowRecommendation[] = [];
    
    if (!context.executionHistory || context.executionHistory.length === 0) {
      return recommendations;
    }

    // Analyze execution patterns
    const recentExecutions = context.executionHistory.slice(-10);
    const failureRate = recentExecutions.filter(e => e.status === 'error').length / recentExecutions.length;
    const avgDuration = recentExecutions.reduce((sum, e) => sum + e.duration, 0) / recentExecutions.length;

    // High failure rate recommendation
    if (failureRate > 0.3) {
      recommendations.push({
        id: 'hist-failure-rate',
        type: 'automation',
        title: 'Improve Error Handling',
        description: `Workflow has ${(failureRate * 100).toFixed(1)}% failure rate in recent executions`,
        confidence: 0.85,
        priority: 'high',
        impact: 'high',
        effort: 'medium',
        implementation: 'Add comprehensive error handling, retry logic, and validation nodes',
        affectedNodes: [],
        estimatedBenefits: {
          reliabilityImprovement: 60
        },
        prerequisites: [],
        relatedRecommendations: [],
        category: 'Historical',
        tags: ['error-handling', 'reliability', 'historical']
      });
    }

    // Long execution time recommendation
    if (avgDuration > 300) { // 5 minutes
      recommendations.push({
        id: 'hist-duration',
        type: 'performance',
        title: 'Optimize Execution Time',
        description: `Average execution time is ${Math.round(avgDuration)}s`,
        confidence: 0.8,
        priority: 'medium',
        impact: 'medium',
        effort: 'high',
        implementation: 'Review workflow logic, identify bottlenecks, and implement parallel processing',
        affectedNodes: [],
        estimatedBenefits: {
          performanceImprovement: 40
        },
        prerequisites: [],
        relatedRecommendations: [],
        category: 'Historical',
        tags: ['performance', 'optimization', 'historical']
      });
    }

    return recommendations;
  }

  /**
   * Generate collaborative recommendations
   */
  private async generateCollaborativeRecommendations(context: RecommendationContext): Promise<WorkflowRecommendation[]> {
    const recommendations: WorkflowRecommendation[] = [];
    
    if (!context.similarWorkflows || context.similarWorkflows.length === 0) {
      return recommendations;
    }

    // Analyze similar workflows
    for (const similarWorkflow of context.similarWorkflows) {
      const similarRecommendations = await this.databaseService.getRecommendationsForWorkflow(similarWorkflow.id);
      
      for (const rec of similarRecommendations) {
        // Adapt recommendation for current workflow
        const adaptedRec: WorkflowRecommendation = {
          ...rec,
          id: `collab-${rec.id}`,
          confidence: rec.confidence * 0.9, // Slightly lower confidence for adapted recommendations
          description: `Based on similar workflow "${similarWorkflow.name}": ${rec.description}`,
          category: 'Collaborative',
          tags: [...rec.tags, 'collaborative', 'community']
        };
        
        recommendations.push(adaptedRec);
      }
    }

    return recommendations;
  }

  /**
   * Analyze workflow patterns
   */
  private analyzeWorkflowPatterns(workflow: Workflow): any[] {
    const patterns: any[] = [];
    const nodes = workflow.nodes || [];

    // Sequential pattern
    if (nodes.length > 5 && this.isSequentialPattern(nodes)) {
      patterns.push({
        type: 'sequential',
        description: 'Long sequential chain detected',
        nodes: nodes.map(n => n.id)
      });
    }

    // Parallel pattern
    const parallelGroups = this.identifyParallelGroups(nodes);
    if (parallelGroups.length > 0) {
      patterns.push({
        type: 'parallel',
        description: 'Parallel execution opportunities identified',
        groups: parallelGroups
      });
    }

    // Loop pattern
    const loops = this.identifyLoops(nodes);
    if (loops.length > 0) {
      patterns.push({
        type: 'loop',
        description: 'Loop patterns detected',
        loops: loops
      });
    }

    return patterns;
  }

  /**
   * Detect anti-patterns
   */
  private detectAntiPatterns(workflow: Workflow): any[] {
    const antiPatterns: any[] = [];
    const nodes = workflow.nodes || [];

    // God workflow anti-pattern
    if (nodes.length > 20) {
      antiPatterns.push({
        name: 'God Workflow',
        description: 'Workflow has too many nodes (>20), making it complex and hard to maintain',
        severity: 'high',
        solution: 'Break down into smaller, focused workflows',
        affectedNodes: nodes.map(n => n.id)
      });
    }

    // Spaghetti anti-pattern
    const connections = this.countConnections(nodes);
    if (connections > nodes.length * 2) {
      antiPatterns.push({
        name: 'Spaghetti Workflow',
        description: 'Too many interconnections making the workflow hard to understand',
        severity: 'medium',
        solution: 'Simplify connections and use sub-workflows',
        affectedNodes: nodes.map(n => n.id)
      });
    }

    // Dead node anti-pattern
    const deadNodes = this.findDeadNodes(nodes);
    if (deadNodes.length > 0) {
      antiPatterns.push({
        name: 'Dead Nodes',
        description: 'Nodes that are never executed due to missing connections',
        severity: 'medium',
        solution: 'Remove dead nodes or fix connections',
        affectedNodes: deadNodes
      });
    }

    return antiPatterns;
  }

  /**
   * Identify pattern opportunities
   */
  private identifyPatternOpportunities(workflow: Workflow): any[] {
    const opportunities: any[] = [];
    const nodes = workflow.nodes || [];

    // Parallelization opportunity
    const sequentialNodes = this.findSequentialNodes(nodes);
    if (sequentialNodes.length > 3) {
      opportunities.push({
        title: 'Parallel Processing Opportunity',
        description: 'Sequential nodes can be executed in parallel',
        type: 'automation',
        implementation: 'Use parallel execution nodes or batch processing',
        affectedNodes: sequentialNodes,
        benefits: { performanceImprovement: 40 }
      });
    }

    // Caching opportunity
    const repeatedNodes = this.findRepeatedNodeTypes(nodes);
    if (repeatedNodes.length > 2) {
      opportunities.push({
        title: 'Caching Opportunity',
        description: 'Repeated operations can benefit from caching',
        type: 'optimization',
        implementation: 'Add caching nodes or external cache services',
        affectedNodes: repeatedNodes,
        benefits: { performanceImprovement: 30 }
      });
    }

    return opportunities;
  }

  /**
   * Helper methods for pattern analysis
   */
  private isSequentialPattern(nodes: Node[]): boolean {
    // Simple check: if each node has only one connection to the next
    for (let i = 0; i < nodes.length - 1; i++) {
      const currentConnections = nodes[i].connections?.outgoing || [];
      if (currentConnections.length !== 1 || currentConnections[0].target !== nodes[i + 1].id) {
        return false;
      }
    }
    return true;
  }

  private identifyParallelGroups(nodes: Node[]): any[] {
    // Identify nodes that can be executed in parallel
    const groups: any[] = [];
    // Implementation would analyze node dependencies
    return groups;
  }

  private identifyLoops(nodes: Node[]): any[] {
    const loops: any[] = [];
    // Implementation would detect circular dependencies
    return loops;
  }

  private countConnections(nodes: Node[]): number {
    return nodes.reduce((count, node) => {
      return count + (node.connections?.outgoing?.length || 0);
    }, 0);
  }

  private findDeadNodes(nodes: Node[]): string[] {
    const deadNodes: string[] = [];
    // Implementation would find nodes with no incoming connections (except start nodes)
    return deadNodes;
  }

  private findSequentialNodes(nodes: Node[]): string[] {
    // Find nodes that are executed sequentially but could be parallelized
    return nodes.filter(node => node.type !== 'start' && node.type !== 'end').map(n => n.id);
  }

  private findRepeatedNodeTypes(nodes: Node[]): string[] {
    const typeCounts: Record<string, number> = {};
    nodes.forEach(node => {
      typeCounts[node.type] = (typeCounts[node.type] || 0) + 1;
    });

    return Object.entries(typeCounts)
      .filter(([, count]) => count > 2)
      .map(([type]) => type);
  }

  /**
   * Utility methods
   */
  private generateCacheKey(context: RecommendationContext): string {
    const workflowId = context.workflow.id;
    const nodeCount = context.workflow.nodes?.length || 0;
    const executionCount = context.executionHistory?.length || 0;
    return `rec:${workflowId}:${nodeCount}:${executionCount}`;
  }

  private removeDuplicateRecommendations(recommendations: WorkflowRecommendation[]): WorkflowRecommendation[] {
    const seen = new Set<string>();
    return recommendations.filter(rec => {
      const key = `${rec.type}:${rec.title}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private filterAndSortRecommendations(recommendations: WorkflowRecommendation[]): WorkflowRecommendation[] {
    return recommendations
      .filter(rec => rec.confidence >= this.config.minConfidence)
      .sort((a, b) => {
        // Sort by priority first, then confidence
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.confidence - a.confidence;
      })
      .slice(0, this.config.maxRecommendations);
  }

  private mapConfidenceToPriority(confidence: number): 'critical' | 'high' | 'medium' | 'low' {
    if (confidence >= 0.9) return 'high';
    if (confidence >= 0.7) return 'medium';
    return 'low';
  }

  private mapConfidenceToImpact(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.85) return 'high';
    if (confidence >= 0.65) return 'medium';
    return 'low';
  }

  /**
   * Get recommendation statistics
   */
  async getRecommendationStats(workflowId?: string): Promise<any> {
    const stats = {
      totalRecommendations: 0,
      byType: {},
      byPriority: {},
      byStatus: {},
      averageConfidence: 0,
      engines: this.engines
    };

    // Implementation would gather statistics from database
    return stats;
  }

  /**
   * Update recommendation engines
   */
  updateEngines(engines: Partial<RecommendationEngine>[]): void {
    for (const engineUpdate of engines) {
      const engine = this.engines.find(e => e.name === engineUpdate.name);
      if (engine) {
        Object.assign(engine, engineUpdate);
        engine.lastUpdated = new Date();
      }
    }
  }
}