/**
 * AI Service for workflow analysis and recommendations
 * Integrates with OpenAI and other AI providers for intelligent insights
 */

import OpenAI from 'openai';
import { Workflow, Node } from '../types';
import { Logger } from '../utils/logger';
import { TelemetryService } from '../telemetry/telemetry-service';

export interface AIServiceConfig {
  provider: 'openai' | 'anthropic' | 'local';
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface AISuggestion {
  title: string;
  description: string;
  implementation: string;
  confidence: number;
  affectedNodes: string[];
  estimatedImpact: number;
}

export interface AIAnalysis {
  suggestions: AISuggestion[];
  insights: string[];
  predictions: {
    successRate: number;
    executionTime: number;
    potentialIssues: string[];
  };
}

export class AIService {
  private static instance: AIService;
  private openai: OpenAI | null = null;
  private config: AIServiceConfig;
  private logger: Logger;
  private telemetryService: TelemetryService;

  private constructor(config: Partial<AIServiceConfig> = {}) {
    this.config = {
      provider: 'openai',
      model: 'gpt-4o-mini',
      maxTokens: 2000,
      temperature: 0.3,
      ...config
    };

    this.logger = new Logger('AIService');
    this.telemetryService = TelemetryService.getInstance();

    if (this.config.apiKey) {
      this.initializeClient();
    }
  }

  static getInstance(config?: Partial<AIServiceConfig>): AIService {
    if (!this.instance) {
      this.instance = new this(config);
    }
    return this.instance;
  }

  private initializeClient(): void {
    if (this.config.provider === 'openai' && this.config.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.config.apiKey
      });
    }
  }

  /**
   * Analyze workflow using AI
   */
  async analyzeWorkflow(workflow: Workflow): Promise<AIAnalysis> {
    if (!this.openai) {
      this.logger.warn('AI service not configured, returning fallback analysis');
      return this.getFallbackAnalysis(workflow);
    }

    try {
      this.logger.info(`Analyzing workflow with AI: ${workflow.name || workflow.id}`);

      const prompt = this.buildWorkflowAnalysisPrompt(workflow);
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty AI response');
      }

      const analysis = this.parseAIAnalysis(content);
      
      this.telemetryService.track('ai.analysis.completed', {
        workflowId: workflow.id,
        suggestionCount: analysis.suggestions.length,
        insightCount: analysis.insights.length,
        model: this.config.model
      });

      return analysis;
    } catch (error) {
      this.logger.error('AI analysis failed', error);
      return this.getFallbackAnalysis(workflow);
    }
  }

  /**
   * Build analysis prompt for AI
   */
  private buildWorkflowAnalysisPrompt(workflow: Workflow): string {
    const workflowSummary = this.generateWorkflowSummary(workflow);
    
    return `You are an expert n8n workflow analyst. Analyze this workflow and provide specific, actionable recommendations.

Workflow Summary:
${workflowSummary}

Provide analysis in the following JSON format:
{
  "suggestions": [
    {
      "title": "specific recommendation title",
      "description": "detailed description of the issue and solution",
      "implementation": "step-by-step implementation instructions",
      "confidence": 0.8,
      "affectedNodes": ["node-id-1", "node-id-2"],
      "estimatedImpact": 75
    }
  ],
  "insights": ["insight 1", "insight 2"],
  "predictions": {
    "successRate": 85,
    "executionTime": 120,
    "potentialIssues": ["issue 1", "issue 2"]
  }
}

Focus on:
1. Performance optimization opportunities
2. Security best practices
3. Error handling improvements
4. Scalability considerations
5. Cost reduction strategies
6. Maintainability enhancements

Be specific and actionable. Provide exact node types and configuration suggestions where applicable.`;
  }

  /**
   * Generate workflow summary for AI
   */
  private generateWorkflowSummary(workflow: Workflow): string {
    const nodeTypes = workflow.nodes.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const connectionCount = workflow.connections?.length || 0;
    const hasCycles = this.detectCycles(workflow);
    const disconnectedNodes = this.findDisconnectedNodes(workflow);

    return `
- Total nodes: ${workflow.nodes.length}
- Node types: ${Object.entries(nodeTypes).map(([type, count]) => `${type} (${count})`).join(', ')}
- Connections: ${connectionCount}
- Has cycles: ${hasCycles}
- Disconnected nodes: ${disconnectedNodes.length}
- Complexity indicators: ${this.calculateComplexityIndicators(workflow)}
`;
  }

  /**
   * Parse AI analysis response
   */
  private parseAIAnalysis(content: string): AIAnalysis {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback: parse manually
      return this.parseManualAIAnalysis(content);
    } catch (error) {
      this.logger.warn('Failed to parse AI analysis, using fallback', error);
      return this.getFallbackAnalysis({ id: 'unknown', nodes: [] } as Workflow);
    }
  }

  /**
   * Manual parsing of AI analysis
   */
  private parseManualAIAnalysis(content: string): AIAnalysis {
    const suggestions: AISuggestion[] = [];
    const insights: string[] = [];

    // Extract suggestions
    const suggestionMatches = content.matchAll(/\*\*(.+?)\*\*[\s\S]*?\n(.+?)(?=\n\n|\n\*\*)/g);
    for (const match of suggestionMatches) {
      suggestions.push({
        title: match[1],
        description: match[2],
        implementation: 'Review and implement based on description',
        confidence: 0.6,
        affectedNodes: [],
        estimatedImpact: 50
      });
    }

    // Extract insights
    const insightMatches = content.matchAll(/\*\*(?:Insight|Key Point):\*\*\s*(.+)/g);
    for (const match of insightMatches) {
      insights.push(match[1]);
    }

    return {
      suggestions,
      insights,
      predictions: {
        successRate: 75,
        executionTime: 60,
        potentialIssues: []
      }
    };
  }

  /**
   * Get fallback analysis when AI is unavailable
   */
  private getFallbackAnalysis(workflow: Workflow): AIAnalysis {
    return {
      suggestions: [
        {
          title: 'Review Node Configuration',
          description: 'Ensure all nodes are properly configured with required parameters.',
          implementation: 'Check each node's configuration and validate required fields.',
          confidence: 0.8,
          affectedNodes: workflow.nodes.map(n => n.id),
          estimatedImpact: 30
        },
        {
          title: 'Add Error Handling',
          description: 'Implement comprehensive error handling for workflow reliability.',
          implementation: 'Add error handling nodes and proper error paths.',
          confidence: 0.7,
          affectedNodes: [],
          estimatedImpact: 40
        }
      ],
      insights: [
        'Workflow contains multiple node types requiring careful configuration',
        'Consider implementing monitoring and logging for production use'
      ],
      predictions: {
        successRate: 70,
        executionTime: 120,
        potentialIssues: ['Configuration errors', 'Missing parameters']
      }
    };
  }

  /**
   * Generate workflow optimization suggestions
   */
  async optimizeWorkflow(workflow: Workflow): Promise<AISuggestion[]> {
    const analysis = await this.analyzeWorkflow(workflow);
    return analysis.suggestions.filter(s => s.confidence > 0.7);
  }

  /**
   * Predict workflow issues
   */
  async predictIssues(workflow: Workflow): Promise<string[]> {
    const analysis = await this.analyzeWorkflow(workflow);
    return analysis.predictions.potentialIssues;
  }

  /**
   * Helper methods
   */
  private detectCycles(workflow: Workflow): boolean {
    // Simplified cycle detection
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingConnections = workflow.connections?.filter(c => c.source === nodeId) || [];
      for (const conn of outgoingConnections) {
        if (dfs(conn.target)) return true;
      }

      recursionStack.delete(nodeId);
      return false;
    };

    return workflow.nodes.some(node => dfs(node.id));
  }

  private findDisconnectedNodes(workflow: Workflow): string[] {
    const connectedNodes = new Set<string>();
    
    workflow.connections?.forEach(conn => {
      connectedNodes.add(conn.source);
      connectedNodes.add(conn.target);
    });

    return workflow.nodes
      .filter(node => !connectedNodes.has(node.id))
      .map(node => node.id);
  }

  private calculateComplexityIndicators(workflow: Workflow): string {
    const indicators = [];
    
    if (workflow.nodes.length > 20) indicators.push('large node count');
    if (workflow.connections?.length > 30) indicators.push('complex connections');
    if (workflow.nodes.some(n => n.type.includes('ai'))) indicators.push('AI components');
    if (workflow.nodes.some(n => n.type.includes('function'))) indicators.push('custom code');

    return indicators.join(', ') || 'standard complexity';
  }
}