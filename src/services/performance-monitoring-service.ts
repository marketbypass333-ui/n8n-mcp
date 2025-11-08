/**
 * Advanced Performance Monitoring & Analytics Service
 * Real-time performance tracking, metrics collection, and analytics
 */

import { Workflow, WorkflowExecution, Node, PerformanceMetrics } from '../types';
import { TelemetryService } from '../telemetry/telemetry-service';
import { DatabaseService } from './database-service';
import { Logger } from '../utils/logger';
import { LRUCache } from 'lru-cache';

export interface PerformanceConfig {
  enableRealTimeMonitoring: boolean;
  enableMetricsCollection: boolean;
  enablePerformanceOptimization: boolean;
  enablePredictiveAnalytics: boolean;
  cacheSize: number;
  cacheTTL: number;
  metricsRetentionDays: number;
  samplingRate: number;
}

export interface PerformanceData {
  workflowId: string;
  executionId: string;
  timestamp: Date;
  duration: number;
  memoryUsage: number;
  cpuUsage: number;
  nodeMetrics: NodePerformanceMetrics[];
  overallScore: number;
  bottlenecks: PerformanceBottleneck[];
  optimizations: PerformanceOptimization[];
}

export interface NodePerformanceMetrics {
  nodeId: string;
  nodeType: string;
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  inputDataSize: number;
  outputDataSize: number;
  errorRate: number;
  efficiency: number;
}

export interface PerformanceBottleneck {
  id: string;
  type: 'memory' | 'cpu' | 'io' | 'network' | 'database';
  severity: 'critical' | 'high' | 'medium' | 'low';
  location: string;
  description: string;
  impact: number;
  suggestedFix: string;
  estimatedImprovement: number;
}

export interface PerformanceOptimization {
  id: string;
  type: 'parallelization' | 'caching' | 'batching' | 'indexing' | 'compression';
  title: string;
  description: string;
  estimatedImprovement: number;
  complexity: 'low' | 'medium' | 'high';
  implementation: string;
  affectedNodes: string[];
}

export interface PerformanceReport {
  workflowId: string;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalExecutions: number;
    averageDuration: number;
    averageMemoryUsage: number;
    averageCpuUsage: number;
    successRate: number;
    performanceScore: number;
  };
  trends: {
    duration: 'improving' | 'stable' | 'degrading';
    memory: 'improving' | 'stable' | 'degrading';
    cpu: 'improving' | 'stable' | 'degrading';
  };
  topBottlenecks: PerformanceBottleneck[];
  topOptimizations: PerformanceOptimization[];
  recommendations: string[];
}

export interface RealTimeMetrics {
  activeWorkflows: number;
  totalExecutions: number;
  averageResponseTime: number;
  errorRate: number;
  throughput: number;
  systemHealth: {
    memory: number;
    cpu: number;
    disk: number;
  };
}

export class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private telemetryService: TelemetryService;
  private databaseService: DatabaseService;
  private logger: Logger;
  private config: PerformanceConfig;
  private cache: LRUCache<string, any>;
  private metrics: Map<string, PerformanceData[]> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enableRealTimeMonitoring: true,
      enableMetricsCollection: true,
      enablePerformanceOptimization: true,
      enablePredictiveAnalytics: true,
      cacheSize: 5000,
      cacheTTL: 1800000, // 30 minutes
      metricsRetentionDays: 30,
      samplingRate: 1.0, // 100% sampling
      ...config
    };

    this.telemetryService = TelemetryService.getInstance();
    this.databaseService = DatabaseService.getInstance();
    this.logger = new Logger('PerformanceMonitoringService');

    this.cache = new LRUCache({
      max: this.config.cacheSize,
      ttl: this.config.cacheTTL
    });

    if (this.config.enableRealTimeMonitoring) {
      this.startRealTimeMonitoring();
    }
  }

  static getInstance(config?: Partial<PerformanceConfig>): PerformanceMonitoringService {
    if (!this.instance) {
      this.instance = new this(config);
    }
    return this.instance;
  }

  /**
   * Record workflow performance metrics
   */
  async recordPerformance(workflowId: string, executionId: string, data: Partial<PerformanceData>): Promise<void> {
    if (!this.config.enableMetricsCollection) return;

    try {
      const performanceData: PerformanceData = {
        workflowId,
        executionId,
        timestamp: new Date(),
        duration: data.duration || 0,
        memoryUsage: data.memoryUsage || 0,
        cpuUsage: data.cpuUsage || 0,
        nodeMetrics: data.nodeMetrics || [],
        overallScore: data.overallScore || 0,
        bottlenecks: data.bottlenecks || [],
        optimizations: data.optimizations || []
      };

      // Store in memory
      if (!this.metrics.has(workflowId)) {
        this.metrics.set(workflowId, []);
      }
      this.metrics.get(workflowId)?.push(performanceData);

      // Store in database
      await this.databaseService.storePerformanceMetrics(performanceData);

      // Cache recent metrics
      const cacheKey = `perf:${workflowId}:${executionId}`;
      this.cache.set(cacheKey, performanceData);

      this.logger.debug(`Recorded performance metrics for workflow ${workflowId}`);
    } catch (error) {
      this.logger.error('Failed to record performance metrics', error);
    }
  }

  /**
   * Analyze workflow performance
   */
  async analyzePerformance(workflowId: string, executionId?: string): Promise<PerformanceData> {
    const cacheKey = executionId ? `perf:${workflowId}:${executionId}` : `perf:${workflowId}:latest`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const metrics = await this.databaseService.getPerformanceMetrics(workflowId, executionId);
      if (!metrics) {
        throw new Error('No performance metrics found');
      }

      const analysis = await this.performPerformanceAnalysis(metrics);
      this.cache.set(cacheKey, analysis);

      return analysis;
    } catch (error) {
      this.logger.error('Failed to analyze performance', error);
      throw error;
    }
  }

  /**
   * Perform comprehensive performance analysis
   */
  private async performPerformanceAnalysis(metrics: PerformanceData): Promise<PerformanceData> {
    const bottlenecks = await this.identifyBottlenecks(metrics);
    const optimizations = await this.identifyOptimizations(metrics);
    const overallScore = this.calculatePerformanceScore(metrics, bottlenecks);

    return {
      ...metrics,
      bottlenecks,
      optimizations,
      overallScore
    };
  }

  /**
   * Identify performance bottlenecks
   */
  private async identifyBottlenecks(metrics: PerformanceData): Promise<PerformanceBottleneck[]> {
    const bottlenecks: PerformanceBottleneck[] = [];

    // Memory bottleneck
    if (metrics.memoryUsage > 500) { // >500MB
      bottlenecks.push({
        id: 'memory-bottleneck',
        type: 'memory',
        severity: metrics.memoryUsage > 1000 ? 'critical' : 'high',
        location: 'Workflow execution',
        description: `High memory usage: ${metrics.memoryUsage}MB`,
        impact: Math.min(100, (metrics.memoryUsage / 1000) * 100),
        suggestedFix: 'Optimize data processing, use streaming, or implement batch processing',
        estimatedImprovement: 30
      });
    }

    // CPU bottleneck
    if (metrics.cpuUsage > 80) { // >80% CPU
      bottlenecks.push({
        id: 'cpu-bottleneck',
        type: 'cpu',
        severity: metrics.cpuUsage > 95 ? 'critical' : 'high',
        location: 'Workflow execution',
        description: `High CPU usage: ${metrics.cpuUsage}%`,
        impact: metrics.cpuUsage,
        suggestedFix: 'Optimize heavy computations, use caching, or parallel processing',
        estimatedImprovement: 25
      });
    }

    // Node-specific bottlenecks
    metrics.nodeMetrics.forEach(nodeMetric => {
      // Slow execution
      if (nodeMetric.executionTime > 30) { // >30 seconds
        bottlenecks.push({
          id: `node-${nodeMetric.nodeId}-slow`,
          type: 'cpu',
          severity: nodeMetric.executionTime > 60 ? 'high' : 'medium',
          location: `Node: ${nodeMetric.nodeType}`,
          description: `Slow node execution: ${nodeMetric.executionTime}s`,
          impact: Math.min(100, (nodeMetric.executionTime / 60) * 100),
          suggestedFix: 'Optimize node configuration or replace with more efficient alternative',
          estimatedImprovement: 40
        });
      }

      // High error rate
      if (nodeMetric.errorRate > 0.1) { // >10% error rate
        bottlenecks.push({
          id: `node-${nodeMetric.nodeId}-errors`,
          type: 'io',
          severity: nodeMetric.errorRate > 0.2 ? 'high' : 'medium',
          location: `Node: ${nodeMetric.nodeType}`,
          description: `High error rate: ${(nodeMetric.errorRate * 100).toFixed(1)}%`,
          impact: nodeMetric.errorRate * 100,
          suggestedFix: 'Add error handling, retry logic, or validate inputs',
          estimatedImprovement: 50
        });
      }
    });

    // Long duration bottleneck
    if (metrics.duration > 300) { // >5 minutes
      bottlenecks.push({
        id: 'duration-bottleneck',
        type: 'cpu',
        severity: metrics.duration > 600 ? 'high' : 'medium',
        location: 'Workflow execution',
        description: `Long execution time: ${Math.round(metrics.duration)}s`,
        impact: Math.min(100, (metrics.duration / 600) * 100),
        suggestedFix: 'Optimize workflow logic, use parallel processing, or implement caching',
        estimatedImprovement: 35
      });
    }

    return bottlenecks.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Identify performance optimizations
   */
  private async identifyOptimizations(metrics: PerformanceData): Promise<PerformanceOptimization[]> {
    const optimizations: PerformanceOptimization[] = [];

    // Parallelization opportunity
    const sequentialNodes = metrics.nodeMetrics.filter(node => 
      node.executionTime > 10 && node.efficiency < 0.7
    );
    if (sequentialNodes.length > 2) {
      optimizations.push({
        id: 'parallelization',
        type: 'parallelization',
        title: 'Implement Parallel Processing',
        description: `Multiple sequential nodes (${sequentialNodes.length}) detected. Consider parallel execution.`,
        estimatedImprovement: 40,
        complexity: 'medium',
        implementation: 'Use batch processing or parallel execution nodes',
        affectedNodes: sequentialNodes.map(n => n.nodeId)
      });
    }

    // Caching opportunity
    const repeatedNodes = this.findRepeatedNodes(metrics.nodeMetrics);
    if (repeatedNodes.length > 0) {
      optimizations.push({
        id: 'caching',
        type: 'caching',
        title: 'Implement Caching Strategy',
        description: 'Repeated operations detected. Cache results to improve performance.',
        estimatedImprovement: 30,
        complexity: 'low',
        implementation: 'Use caching nodes or external cache services',
        affectedNodes: repeatedNodes
      });
    }

    // Batching opportunity
    const smallNodes = metrics.nodeMetrics.filter(node => 
      node.inputDataSize < 1000 && node.executionTime < 1
    );
    if (smallNodes.length > 5) {
      optimizations.push({
        id: 'batching',
        type: 'batching',
        title: 'Implement Batching',
        description: `Many small operations (${smallNodes.length}) detected. Batch for efficiency.`,
        estimatedImprovement: 25,
        complexity: 'medium',
        implementation: 'Use batch processing nodes to group operations',
        affectedNodes: smallNodes.map(n => n.nodeId)
      });
    }

    // Memory optimization
    if (metrics.memoryUsage > 200) {
      optimizations.push({
        id: 'memory-optimization',
        type: 'compression',
        title: 'Optimize Memory Usage',
        description: `High memory usage (${metrics.memoryUsage}MB) detected. Optimize data handling.`,
        estimatedImprovement: 20,
        complexity: 'medium',
        implementation: 'Use streaming, data compression, or memory-efficient processing',
        affectedNodes: []
      });
    }

    return optimizations.sort((a, b) => b.estimatedImprovement - a.estimatedImprovement);
  }

  /**
   * Find repeated nodes
   */
  private findRepeatedNodes(nodeMetrics: NodePerformanceMetrics[]): string[] {
    const nodeTypeCounts: Record<string, number> = {};
    nodeMetrics.forEach(metric => {
      nodeTypeCounts[metric.nodeType] = (nodeTypeCounts[metric.nodeType] || 0) + 1;
    });

    return Object.entries(nodeTypeCounts)
      .filter(([_, count]) => count > 2)
      .map(([nodeType]) => nodeType);
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(metrics: PerformanceData, bottlenecks: PerformanceBottleneck[]): number {
    let score = 80; // Base score

    // Duration impact
    if (metrics.duration < 60) score += 10; // Under 1 minute
    else if (metrics.duration > 300) score -= 20; // Over 5 minutes

    // Memory impact
    if (metrics.memoryUsage < 100) score += 5;
    else if (metrics.memoryUsage > 500) score -= 15;

    // CPU impact
    if (metrics.cpuUsage < 50) score += 5;
    else if (metrics.cpuUsage > 80) score -= 10;

    // Bottleneck impact
    const totalImpact = bottlenecks.reduce((sum, b) => sum + b.impact, 0);
    score -= Math.min(30, totalImpact / 10);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate performance report
   */
  async generateReport(workflowId: string, period: { start: Date; end: Date }): Promise<PerformanceReport> {
    try {
      const metrics = await this.databaseService.getPerformanceMetricsForPeriod(workflowId, period);
      
      const summary = this.calculateSummaryMetrics(metrics);
      const trends = this.calculateTrends(metrics);
      const topBottlenecks = this.aggregateBottlenecks(metrics);
      const topOptimizations = this.aggregateOptimizations(metrics);
      const recommendations = this.generateRecommendations(metrics);

      return {
        workflowId,
        period,
        summary,
        trends,
        topBottlenecks,
        topOptimizations,
        recommendations
      };
    } catch (error) {
      this.logger.error('Failed to generate performance report', error);
      throw error;
    }
  }

  /**
   * Calculate summary metrics
   */
  private calculateSummaryMetrics(metrics: PerformanceData[]): any {
    if (metrics.length === 0) {
      return {
        totalExecutions: 0,
        averageDuration: 0,
        averageMemoryUsage: 0,
        averageCpuUsage: 0,
        successRate: 0,
        performanceScore: 0
      };
    }

    const totalExecutions = metrics.length;
    const averageDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / totalExecutions;
    const averageMemoryUsage = metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / totalExecutions;
    const averageCpuUsage = metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / totalExecutions;
    const successRate = (metrics.filter(m => m.overallScore > 60).length / totalExecutions) * 100;
    const performanceScore = metrics.reduce((sum, m) => sum + m.overallScore, 0) / totalExecutions;

    return {
      totalExecutions,
      averageDuration: Math.round(averageDuration * 100) / 100,
      averageMemoryUsage: Math.round(averageMemoryUsage * 100) / 100,
      averageCpuUsage: Math.round(averageCpuUsage * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
      performanceScore: Math.round(performanceScore * 100) / 100
    };
  }

  /**
   * Calculate performance trends
   */
  private calculateTrends(metrics: PerformanceData[]): any {
    if (metrics.length < 2) {
      return { duration: 'stable', memory: 'stable', cpu: 'stable' };
    }

    const recent = metrics.slice(-Math.ceil(metrics.length / 2));
    const older = metrics.slice(0, Math.floor(metrics.length / 2));

    const recentAvgDuration = recent.reduce((sum, m) => sum + m.duration, 0) / recent.length;
    const olderAvgDuration = older.reduce((sum, m) => sum + m.duration, 0) / older.length;

    const recentAvgMemory = recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length;
    const olderAvgMemory = older.reduce((sum, m) => sum + m.memoryUsage, 0) / older.length;

    const recentAvgCpu = recent.reduce((sum, m) => sum + m.cpuUsage, 0) / recent.length;
    const olderAvgCpu = older.reduce((sum, m) => sum + m.cpuUsage, 0) / older.length;

    const durationTrend = this.calculateTrend(recentAvgDuration, olderAvgDuration);
    const memoryTrend = this.calculateTrend(recentAvgMemory, olderAvgMemory);
    const cpuTrend = this.calculateTrend(recentAvgCpu, olderAvgCpu);

    return {
      duration: durationTrend,
      memory: memoryTrend,
      cpu: cpuTrend
    };
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(recent: number, older: number): 'improving' | 'stable' | 'degrading' {
    const change = ((recent - older) / older) * 100;
    
    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'degrading' : 'improving';
  }

  /**
   * Aggregate bottlenecks
   */
  private aggregateBottlenecks(metrics: PerformanceData[]): PerformanceBottleneck[] {
    const allBottlenecks: PerformanceBottleneck[] = [];
    metrics.forEach(m => allBottlenecks.push(...m.bottlenecks));

    const bottleneckCounts: Record<string, number> = {};
    allBottlenecks.forEach(b => {
      bottleneckCounts[b.id] = (bottleneckCounts[b.id] || 0) + 1;
    });

    const topBottlenecks = Object.entries(bottleneckCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => allBottlenecks.find(b => b.id === id))
      .filter(Boolean) as PerformanceBottleneck[];

    return topBottlenecks;
  }

  /**
   * Aggregate optimizations
   */
  private aggregateOptimizations(metrics: PerformanceData[]): PerformanceOptimization[] {
    const allOptimizations: PerformanceOptimization[] = [];
    metrics.forEach(m => allOptimizations.push(...m.optimizations));

    const optimizationCounts: Record<string, number> = {};
    allOptimizations.forEach(o => {
      optimizationCounts[o.id] = (optimizationCounts[o.id] || 0) + 1;
    });

    const topOptimizations = Object.entries(optimizationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => allOptimizations.find(o => o.id === id))
      .filter(Boolean) as PerformanceOptimization[];

    return topOptimizations;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(metrics: PerformanceData[]): string[] {
    const recommendations: string[] = [];

    const summary = this.calculateSummaryMetrics(metrics);
    
    if (summary.averageDuration > 300) {
      recommendations.push('Consider optimizing workflow execution time - current average is over 5 minutes');
    }

    if (summary.averageMemoryUsage > 500) {
      recommendations.push('High memory usage detected - implement memory optimization strategies');
    }

    if (summary.successRate < 90) {
      recommendations.push('Low success rate detected - review error handling and workflow logic');
    }

    if (summary.performanceScore < 70) {
      recommendations.push('Overall performance score is low - implement recommended optimizations');
    }

    return recommendations;
  }

  /**
   * Get real-time metrics
   */
  getRealTimeMetrics(): RealTimeMetrics {
    const now = Date.now();
    const recentMetrics = Array.from(this.metrics.values())
      .flat()
      .filter(m => now - m.timestamp.getTime() < 300000); // Last 5 minutes

    const activeWorkflows = new Set(recentMetrics.map(m => m.workflowId)).size;
    const totalExecutions = recentMetrics.length;
    const averageResponseTime = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalExecutions 
      : 0;
    const errorRate = totalExecutions > 0 
      ? (recentMetrics.filter(m => m.overallScore < 50).length / totalExecutions) * 100 
      : 0;
    const throughput = totalExecutions / 5; // Executions per minute

    return {
      activeWorkflows,
      totalExecutions,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      throughput: Math.round(throughput * 100) / 100,
      systemHealth: this.getSystemHealth()
    };
  }

  /**
   * Get system health metrics
   */
  private getSystemHealth(): { memory: number; cpu: number; disk: number } {
    // Simplified system health calculation
    // In a real implementation, this would use system monitoring APIs
    return {
      memory: Math.random() * 30 + 60, // 60-90%
      cpu: Math.random() * 40 + 40,    // 40-80%
      disk: Math.random() * 20 + 70     // 70-90%
    };
  }

  /**
   * Start real-time monitoring
   */
  private startRealTimeMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      const metrics = this.getRealTimeMetrics();
      
      // Alert on critical conditions
      if (metrics.errorRate > 10) {
        this.logger.warn('High error rate detected', { errorRate: metrics.errorRate });
      }

      if (metrics.systemHealth.memory > 90) {
        this.logger.warn('High memory usage', { memory: metrics.systemHealth.memory });
      }

      // Track metrics
      this.telemetryService.track('performance.metrics.realtime', metrics);
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop real-time monitoring
   */
  stopRealTimeMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Optimize workflow performance
   */
  async optimizeWorkflow(workflow: Workflow): Promise<PerformanceOptimization[]> {
    if (!this.config.enablePerformanceOptimization) return [];

    try {
      this.logger.info(`Optimizing workflow performance: ${workflow.name || workflow.id}`);

      // Get current performance metrics
      const recentMetrics = await this.databaseService.getRecentPerformanceMetrics(workflow.id, 10);
      
      if (recentMetrics.length === 0) {
        return [];
      }

      const averagePerformance = this.calculateSummaryMetrics(recentMetrics);
      const optimizations = await this.identifyOptimizations(averagePerformance);

      this.telemetryService.track('performance.optimization.completed', {
        workflowId: workflow.id,
        optimizationCount: optimizations.length,
        averageScore: averagePerformance.performanceScore
      });

      return optimizations;
    } catch (error) {
      this.logger.error('Failed to optimize workflow performance', error);
      return [];
    }
  }

  /**
   * Predict performance issues
   */
  async predictPerformanceIssues(workflowId: string): Promise<any[]> {
    if (!this.config.enablePredictiveAnalytics) return [];

    try {
      const historicalMetrics = await this.databaseService.getHistoricalPerformanceMetrics(workflowId, 30);
      
      if (historicalMetrics.length < 5) {
        return [];
      }

      // Simple trend analysis
      const recentMetrics = historicalMetrics.slice(-5);
      const olderMetrics = historicalMetrics.slice(0, 5);

      const recentAvgDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;
      const olderAvgDuration = olderMetrics.reduce((sum, m) => sum + m.duration, 0) / olderMetrics.length;

      const durationTrend = ((recentAvgDuration - olderAvgDuration) / olderAvgDuration) * 100;

      const predictions = [];

      if (durationTrend > 20) {
        predictions.push({
          type: 'performance-degradation',
          confidence: 0.8,
          description: `Performance degrading by ${durationTrend.toFixed(1)}% over time`,
          timeframe: 'next 7 days',
          recommendedAction: 'Investigate performance bottlenecks and optimize workflow'
        });
      }

      // Memory trend
      const recentAvgMemory = recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length;
      const olderAvgMemory = olderMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / olderMetrics.length;
      const memoryTrend = ((recentAvgMemory - olderAvgMemory) / olderAvgMemory) * 100;

      if (memoryTrend > 15) {
        predictions.push({
          type: 'memory-leak',
          confidence: 0.7,
          description: `Memory usage increasing by ${memoryTrend.toFixed(1)}%`,
          timeframe: 'next 14 days',
          recommendedAction: 'Check for memory leaks and optimize data handling'
        });
      }

      return predictions;
    } catch (error) {
      this.logger.error('Failed to predict performance issues', error);
      return [];
    }
  }

  /**
   * Clean up old metrics
   */
  async cleanupOldMetrics(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.metricsRetentionDays);

      await this.databaseService.deleteOldPerformanceMetrics(cutoffDate);
      
      // Clean up memory cache
      this.metrics.forEach((metrics, workflowId) => {
        const filteredMetrics = metrics.filter(m => m.timestamp > cutoffDate);
        if (filteredMetrics.length !== metrics.length) {
          this.metrics.set(workflowId, filteredMetrics);
        }
      });

      this.logger.info('Cleaned up old performance metrics');
    } catch (error) {
      this.logger.error('Failed to cleanup old metrics', error);
    }
  }
}