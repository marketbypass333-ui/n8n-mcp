/**
 * Advanced Features Usage Example
 * Demonstrates how to use the advanced features in n8n-MCP
 */

import { initializeAdvancedFeatures, analyzeWorkflowEnhanced, getSystemHealth } from '../src/advanced-features';
import { Workflow } from '../src/types';

/**
 * Example: Initialize and use advanced features
 */
async function exampleUsage() {
  console.log('🚀 Initializing n8n-MCP Advanced Features...');

  // Initialize all advanced features
  const features = initializeAdvancedFeatures({
    enableIntelligence: true,
    enablePerformanceMonitoring: true,
    enableRecommendations: true,
    enableCollaboration: true,
    enableSecurity: true,
    enableMultiCloud: true,
    enableAI: true
  });

  // Example workflow
  const exampleWorkflow: Workflow = {
    id: 'example-workflow-001',
    name: 'Customer Data Processing Workflow',
    nodes: [
      {
        id: 'trigger-node',
        type: 'n8n-nodes-base.trigger',
        name: 'Webhook Trigger',
        parameters: {
          path: 'webhook/customer-data'
        }
      },
      {
        id: 'process-node',
        type: 'n8n-nodes-base.function',
        name: 'Process Customer Data',
        parameters: {
          functionCode: `
            // Process customer data
            const processedData = items.map(item => ({
              ...item,
              processed: true,
              timestamp: new Date().toISOString()
            }));
            return processedData;
          `
        }
      },
      {
        id: 'store-node',
        type: 'n87-nodes-base.postgres',
        name: 'Store in Database',
        parameters: {
          operation: 'insert',
          table: 'customer_data'
        }
      }
    ],
    connections: [
      {
        node: 'trigger-node',
        type: 'main',
        index: 0
      },
      {
        node: 'process-node',
        type: 'main',
        index: 0
      },
      {
        node: 'store-node',
        type: 'main',
        index: 0
      }
    ],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  console.log('🔍 Running enhanced workflow analysis...');

  // Run comprehensive analysis
  const analysis = await analyzeWorkflowEnhanced(features, exampleWorkflow, {
    executionHistory: [],
    similarWorkflows: [],
    userPreferences: {
      preferredNodeTypes: ['n8n-nodes-base.function', 'n8n-nodes-base.webhook'],
      preferredIntegrations: ['postgres', 'smtp'],
      complexityPreference: 'moderate',
      automationLevel: 'semi-automated',
      securityLevel: 'enhanced',
      performancePriority: 'balanced'
    }
  });

  console.log('📊 Analysis Results:');
  console.log('- Intelligence:', analysis.intelligence ? '✅ Completed' : '❌ Failed');
  console.log('- Performance:', analysis.performance ? '✅ Completed' : '❌ Failed');
  console.log('- Recommendations:', analysis.recommendations ? '✅ Completed' : '❌ Failed');
  console.log('- Security:', analysis.security ? '✅ Completed' : '❌ Failed');

  // Display detailed results
  if (analysis.intelligence) {
    console.log('\n🧠 Intelligence Analysis:');
    console.log('- Complexity Score:', analysis.intelligence.overallScore);
    console.log('- Patterns Found:', analysis.intelligence.patterns.length);
    console.log('- Anomalies:', analysis.intelligence.anomalies.length);
    console.log('- Recommendations:', analysis.intelligence.recommendations.length);
  }

  if (analysis.recommendations) {
    console.log('\n💡 AI Recommendations:');
    analysis.recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.title} (${rec.confidence * 100}% confidence)`);
      console.log(`   ${rec.description}`);
      console.log(`   Impact: ${rec.impact}, Effort: ${rec.effort}`);
    });
  }

  // Check system health
  console.log(\n\n🏥 System Health Check:');
  const health = await getSystemHealth(features);
  console.log('- Overall Status:', health.status);
  console.log('- Active Services:', Object.keys(health.services).length);
  console.log('- Alerts:', health.alerts.length);

  // Example: Performance monitoring
  if (features.performance) {
    console.log(\n\n⚡ Real-time Performance Metrics:');
    const metrics = features.performance.getRealTimeMetrics();
    console.log('- Active Workflows:', metrics.activeWorkflows);
    console.log('- Total Executions:', metrics.totalExecutions);
    console.log('- Average Response Time:', metrics.averageResponseTime.toFixed(2) + 's');
    console.log('- Error Rate:', (metrics.errorRate * 100).toFixed(1) + '%');
  }

  // Example: Collaboration features
  if (features.collaboration) {
    console.log(\n\n👥 Collaboration Features:');
    const collabMetrics = features.collaboration.getRealTimeMetrics();
    console.log('- Active Sessions:', collabMetrics.activeSessions);
    console.log('- Total Users:', collabMetrics.totalUsers);
  }

  // Example: Security features
  if (features.security) {
    console.log(\n\n🔒 Security Features:');
    const securityStats = await features.security.getSecurityStats();
    console.log('- Active Rules:', securityStats.activeRules);
    console.log('- Threat Detection:', securityStats.threatDetectionEnabled ? '✅ Enabled' : '❌ Disabled');
    console.log('- Encryption:', securityStats.encryptionEnabled ? '✅ Enabled' : '❌ Disabled');
  }

  // Example: Multi-cloud features
  if (features.multiCloud) {
    console.log(\n\n☁️ Multi-Cloud Capabilities:');
    const providers = features.multiCloud.getCloudProviders();
    console.log('- Cloud Providers:', providers.map(p => p.name).join(', '));
    console.log('- Active Deployments:', features.multiCloud.getDeployments().length);
    console.log('- Multi-Cloud Strategies:', features.multiCloud.getMultiCloudStrategies().length);

    // Get cost analysis
    const costAnalysis = await features.multiCloud.getCostAnalysis();
    console.log('- Total Monthly Cost:', '$' + costAnalysis.totalCost.toFixed(2));
    console.log('- Optimization Potential:', (costAnalysis.optimization * 100).toFixed(1) + '%');
  }

  console.log(\n\n✅ Advanced Features Demo Complete!');
  console.log(\n📝 Key Capabilities Demonstrated:');
  console.log('- ✅ AI-Powered Workflow Intelligence');
  console.log('- ✅ Performance Monitoring & Analytics');
  console.log('- ✅ Smart Workflow Recommendations');
  console.log('- ✅ Real-time Collaboration');
  console.log('- ✅ Advanced Security & Compliance');
  console.log('- ✅ Multi-Cloud Integration');
  console.log('- ✅ Cost Optimization');
  console.log('- ✅ Predictive Analytics');
}

/**
 * Example: Performance optimization
 */
async function performanceOptimizationExample(features: AdvancedFeatures) {
  if (!features.performance) return;

  console.log(\n\n⚡ Performance Optimization Example:');

  // Simulate recording performance metrics
  await features.performance.recordPerformance('example-workflow-001',
    'execution-001',
    {
      duration: 120,
      memoryUsage: 256,
      cpuUsage: 75,
      nodeMetrics: [
        {
          nodeId: 'process-node',
          nodeType: 'n8n-nodes-base.function',
          executionTime: 45,
          memoryUsage: 128,
          cpuUsage: 60,
          inputDataSize: 1024,
          outputDataSize: 2048,
          errorRate: 0.02,
          efficiency: 0.85
        }
      ],
      overallScore: 78
    }
  );

  // Generate performance report
  const report = await features.performance.generateReport(
    'example-workflow-001',
    {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      end: new Date()
    }
  );

  console.log('- Performance Score:', report.summary.performanceScore);
  console.log('- Average Duration:', report.summary.averageDuration.toFixed(2) + 's');
  console.log('- Success Rate:', (report.summary.successRate * 100).toFixed(1) + '%');
  console.log('- Top Bottlenecks:', report.topBottlenecks.length);
  console.log('- Optimization Opportunities:', report.topOptimizations.length);
}

/**
 * Example: Collaboration session
 */
async function collaborationExample(features: AdvancedFeatures) {
  if (!features.collaboration) return;

  console.log(\n\n👥 Collaboration Example:');

  // Create a collaboration session
  const session = await features.collaboration.createSession(
    'example-workflow-001',
    'user-001',
    {
      canEdit: true,
      canComment: true,
      canInvite: true,
      canDelete: false,
      canManageVersions: true,
      canExport: true
    }
  );

  console.log('- Session Created:', session.id);
  console.log('- Owner:', session.users[0].user.name);
  console.log('- Permissions:', Object.keys(session.permissions).filter(p => session.permissions[p]).join(', '));

  // Add a comment
  const comment = await features.collaboration.addComment(
    session.id,
    'user-001',
    {
      targetType: 'node',
      targetId: 'process-node',
      content: 'This processing node could be optimized for better performance.',
      position: { x: 100, y: 200 }
    }
  );

  console.log('- Comment Added:', comment.id);
  console.log('- Comment Content:', comment.content);
}

/**
 * Example: Security and compliance
 */
async function securityExample(features: AdvancedFeatures) {
  if (!features.security) return;

  console.log(\n\n🔒 Security Example:');

  // Run compliance audit
  const complianceReport = await features.security.getComplianceReport();
  console.log('- Total Frameworks:', complianceReport.summary.totalFrameworks);
  console.log('- Compliant Frameworks:', complianceReport.summary.compliantFrameworks);
  console.log('- Non-Compliant Frameworks:', complianceReport.summary.nonCompliantFrameworks);

  // Example authentication (would normally be done through the security service)
  const authResult = await features.security.authenticateUser(
    'testuser',
    'TestPassword123!',
    {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...''
    }
  );

  console.log('- Authentication:', authResult.success ? '✅ Success' : '❌ Failed');
  if (authResult.success) {
    console.log('- User:', authResult.user?.name);
    console.log('- Token:', authResult.token?.substring(0, 10) + '...');
  }
}

/**
 * Example: Multi-cloud deployment
 */
async function multiCloudExample(features: AdvancedFeatures) {
  if (!features.multiCloud) return;

  console.log(\n\n☁️ Multi-Cloud Deployment Example:');

  // Deploy to multiple cloud providers
  const deployments = await features.multiCloud.executeMultiCloudStrategy(
    'cost-optimization',
    {
      id: 'example-workflow-001',
      name: 'Multi-Cloud Workflow',
      nodes: [],
      connections: [],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  );

  console.log('- Deployments Created:', deployments.length);
  deployments.forEach((deployment, index) => {
    console.log(`  ${index + 1}. ${deployment.provider} (${deployment.region}) - Cost: $${deployment.cost.toFixed(2)}/month`);
  });

  // Optimize deployments
  for (const deployment of deployments) {
    const optimization = await features.multiCloud.optimizeDeployment(deployment.id);
    console.log(`\n- ${deployment.provider} Optimization:`);
    console.log(`  - Current Cost: $${optimization.currentCost.toFixed(2)}/month`);
    console.log(`  - Projected Cost: $${optimization.projectedCost.toFixed(2)}/month`);
    console.log(`  - Potential Savings: $${optimization.savings.toFixed(2)}/month`);
    console.log(`  - Optimization Potential: ${optimization.optimization.toFixed(1)}%`);
  }
}

// Run the example
if (require.main === module) {
  exampleUsage().catch(console.error);
}

export { exampleUsage, performanceOptimizationExample, collaborationExample, securityExample, multiCloudExample };