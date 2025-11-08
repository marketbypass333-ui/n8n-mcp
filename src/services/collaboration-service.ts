/**
 * Real-time Collaboration Features
 * Multi-user collaboration, real-time updates, and shared workflow development
 */

import { Workflow, Node, WorkflowExecution, User } from '../types';
import { DatabaseService } from './database-service';
import { TelemetryService } from '../telemetry/telemetry-service';
import { Logger } from '../utils/logger';
import { EventEmitter } from 'events';

export interface CollaborationConfig {
  enableRealTimeEditing: boolean;
  enableUserPresence: boolean;
  enableConflictResolution: boolean;
  enableVersionControl: boolean;
  enableCommenting: boolean;
  enableNotifications: boolean;
  maxConcurrentUsers: number;
  sessionTimeout: number;
  syncInterval: number;
}

export interface CollaborationSession {
  id: string;
  workflowId: string;
  users: Collaborator[];
  createdAt: Date;
  lastActivity: Date;
  state: 'active' | 'idle' | 'ended';
  permissions: CollaborationPermissions;
  metadata: Record<string, any>;
}

export interface Collaborator {
  userId: string;
  user: User;
  role: 'owner' | 'editor' | 'viewer';
  status: 'active' | 'idle' | 'offline';
  cursor?: CursorPosition;
  selection?: SelectionRange;
  lastActivity: Date;
  permissions: string[];
}

export interface CursorPosition {
  x: number;
  y: number;
  nodeId?: string;
  timestamp: Date;
}

export interface SelectionRange {
  startNodeId: string;
  endNodeId?: string;
  selectedNodes: string[];
  timestamp: Date;
}

export interface CollaborationChange {
  id: string;
  sessionId: string;
  userId: string;
  type: 'node_add' | 'node_remove' | 'node_update' | 'connection_add' | 'connection_remove' | 'workflow_update';
  target: string;
  changes: any;
  timestamp: Date;
  version: number;
  conflicts?: ChangeConflict[];
}

export interface ChangeConflict {
  id: string;
  type: 'edit_conflict' | 'permission_conflict' | 'version_conflict';
  severity: 'low' | 'medium' | 'high';
  description: string;
  proposedResolution: string;
  alternatives: string[];
}

export interface CollaborationComment {
  id: string;
  sessionId: string;
  userId: string;
  targetType: 'node' | 'connection' | 'workflow';
  targetId: string;
  content: string;
  position?: { x: number; y: number };
  status: 'active' | 'resolved' | 'dismissed';
  replies: CommentReply[];
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

export interface CommentReply {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
}

export interface CollaborationNotification {
  id: string;
  sessionId: string;
  userId: string;
  type: 'user_joined' | 'user_left' | 'change_conflict' | 'comment_added' | 'permission_changed';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  createdAt: Date;
  metadata: Record<string, any>;
}

export interface VersionSnapshot {
  id: string;
  workflowId: string;
  version: number;
  createdBy: string;
  createdAt: Date;
  description: string;
  changes: CollaborationChange[];
  metadata: Record<string, any>;
}

export interface CollaborationPermissions {
  canEdit: boolean;
  canComment: boolean;
  canInvite: boolean;
  canDelete: boolean;
  canManageVersions: boolean;
  canExport: boolean;
}

export interface RealTimeUpdate {
  type: 'user_joined' | 'user_left' | 'cursor_move' | 'selection_change' | 'change_applied' | 'comment_added' | 'conflict_detected';
  sessionId: string;
  userId: string;
  data: any;
  timestamp: Date;
}

export class CollaborationService extends EventEmitter {
  private static instance: CollaborationService;
  private databaseService: DatabaseService;
  private telemetryService: TelemetryService;
  private logger: Logger;
  private config: CollaborationConfig;
  private sessions: Map<string, CollaborationSession> = new Map();
  private activeChanges: Map<string, CollaborationChange[]> = new Map();
  private userSessions: Map<string, Set<string>> = new Map(); // userId -> sessionIds

  private constructor(config: Partial<CollaborationConfig> = {}) {
    super();
    this.config = {
      enableRealTimeEditing: true,
      enableUserPresence: true,
      enableConflictResolution: true,
      enableVersionControl: true,
      enableCommenting: true,
      enableNotifications: true,
      maxConcurrentUsers: 10,
      sessionTimeout: 1800000, // 30 minutes
      syncInterval: 5000, // 5 seconds
      ...config
    };

    this.databaseService = DatabaseService.getInstance();
    this.telemetryService = TelemetryService.getInstance();
    this.logger = new Logger('CollaborationService');

    this.initializeCleanupInterval();
  }

  static getInstance(config?: Partial<CollaborationConfig>): CollaborationService {
    if (!this.instance) {
      this.instance = new this(config);
    }
    return this.instance;
  }

  /**
   * Create a new collaboration session
   */
  async createSession(workflowId: string, creatorId: string, permissions?: Partial<CollaborationPermissions>): Promise<CollaborationSession> {
    try {
      const sessionId = this.generateSessionId();
      const creator = await this.databaseService.getUserById(creatorId);
      
      if (!creator) {
        throw new Error('Creator user not found');
      }

      const session: CollaborationSession = {
        id: sessionId,
        workflowId,
        users: [{
          userId: creatorId,
          user: creator,
          role: 'owner',
          status: 'active',
          lastActivity: new Date(),
          permissions: this.getRolePermissions('owner')
        }],
        createdAt: new Date(),
        lastActivity: new Date(),
        state: 'active',
        permissions: {
          canEdit: true,
          canComment: true,
          canInvite: true,
          canDelete: true,
          canManageVersions: true,
          canExport: true,
          ...permissions
        },
        metadata: {}
      };

      this.sessions.set(sessionId, session);
      this.activeChanges.set(sessionId, []);

      // Track user's session
      if (!this.userSessions.has(creatorId)) {
        this.userSessions.set(creatorId, new Set());
      }
      this.userSessions.get(creatorId)!.add(sessionId);

      this.emit('sessionCreated', { sessionId, workflowId, creatorId });
      this.telemetryService.track('collaboration.session.created', { sessionId, workflowId, creatorId });

      this.logger.info(`Collaboration session created: ${sessionId} for workflow: ${workflowId}`);

      return session;
    } catch (error) {
      this.logger.error('Failed to create collaboration session', error);
      throw error;
    }
  }

  /**
   * Join an existing collaboration session
   */
  async joinSession(sessionId: string, userId: string, role: 'editor' | 'viewer' = 'viewer'): Promise<CollaborationSession> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.state !== 'active') {
      throw new Error('Session is not active');
    }

    if (session.users.length >= this.config.maxConcurrentUsers) {
      throw new Error('Maximum number of concurrent users reached');
    }

    try {
      const user = await this.databaseService.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const collaborator: Collaborator = {
        userId,
        user,
        role,
        status: 'active',
        lastActivity: new Date(),
        permissions: this.getRolePermissions(role)
      };

      session.users.push(collaborator);
      session.lastActivity = new Date();

      // Track user's session
      if (!this.userSessions.has(userId)) {
        this.userSessions.set(userId, new Set());
      }
      this.userSessions.get(userId)!.add(sessionId);

      // Notify other users
      this.broadcastToSession(sessionId, 'user_joined', {
        userId,
        user: user.name,
        role,
        timestamp: new Date()
      });

      this.emit('userJoined', { sessionId, userId, role });
      this.telemetryService.track('collaboration.user.joined', { sessionId, userId, role });

      this.logger.info(`User ${userId} joined session ${sessionId} as ${role}`);

      return session;
    } catch (error) {
      this.logger.error('Failed to join session', error);
      throw error;
    }
  }

  /**
   * Leave a collaboration session
   */
  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    const userIndex = session.users.findIndex(u => u.userId === userId);
    if (userIndex === -1) {
      throw new Error('User not in session');
    }

    const user = session.users[userIndex];
    session.users.splice(userIndex, 1);
    session.lastActivity = new Date();

    // Remove from user's sessions
    const userSessions = this.userSessions.get(userId);
    if (userSessions) {
      userSessions.delete(sessionId);
      if (userSessions.size === 0) {
        this.userSessions.delete(userId);
      }
    }

    // Notify other users
    this.broadcastToSession(sessionId, 'user_left', {
      userId,
      user: user.user.name,
      timestamp: new Date()
    });

    // End session if no users remain
    if (session.users.length === 0) {
      await this.endSession(sessionId);
    }

    this.emit('userLeft', { sessionId, userId });
    this.telemetryService.track('collaboration.user.left', { sessionId, userId });

    this.logger.info(`User ${userId} left session ${sessionId}`);
  }

  /**
   * End a collaboration session
   */
  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    session.state = 'ended';
    session.lastActivity = new Date();

    // Clean up
    this.sessions.delete(sessionId);
    this.activeChanges.delete(sessionId);

    // Remove from all users' sessions
    for (const userId of this.userSessions.keys()) {
      const userSessions = this.userSessions.get(userId);
      if (userSessions && userSessions.has(sessionId)) {
        userSessions.delete(sessionId);
        if (userSessions.size === 0) {
          this.userSessions.delete(userId);
        }
      }
    }

    this.emit('sessionEnded', { sessionId, workflowId: session.workflowId });
    this.telemetryService.track('collaboration.session.ended', { sessionId, workflowId: session.workflowId });

    this.logger.info(`Collaboration session ended: ${sessionId}`);
  }

  /**
   * Apply a change to the workflow
   */
  async applyChange(sessionId: string, userId: string, change: Partial<CollaborationChange>): Promise<CollaborationChange> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    const user = session.users.find(u => u.userId === userId);
    if (!user) {
      throw new Error('User not in session');
    }

    if (!this.hasPermission(user, change.type!)) {
      throw new Error('Insufficient permissions');
    }

    const fullChange: CollaborationChange = {
      id: this.generateChangeId(),
      sessionId,
      userId,
      type: change.type!,
      target: change.target!,
      changes: change.changes || {},
      timestamp: new Date(),
      version: this.getNextVersion(sessionId),
      conflicts: []
    };

    // Check for conflicts
    if (this.config.enableConflictResolution) {
      const conflicts = await this.detectConflicts(sessionId, fullChange);
      if (conflicts.length > 0) {
        fullChange.conflicts = conflicts;
        this.handleConflicts(sessionId, fullChange);
        return fullChange;
      }
    }

    // Apply the change
    const changes = this.activeChanges.get(sessionId) || [];
    changes.push(fullChange);
    this.activeChanges.set(sessionId, changes);

    // Update session activity
    session.lastActivity = new Date();
    user.lastActivity = new Date();

    // Broadcast to other users
    this.broadcastToSession(sessionId, 'change_applied', {
      change: fullChange,
      userId,
      timestamp: new Date()
    });

    this.emit('changeApplied', { sessionId, change: fullChange });
    this.telemetryService.track('collaboration.change.applied', { sessionId, changeType: change.type });

    return fullChange;
  }

  /**
   * Update user cursor position
   */
  updateCursorPosition(sessionId: string, userId: string, position: CursorPosition): void {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    const user = session.users.find(u => u.userId === userId);
    if (!user) {
      throw new Error('User not in session');
    }

    user.cursor = position;
    user.lastActivity = new Date();

    // Broadcast to other users
    this.broadcastToSession(sessionId, 'cursor_move', {
      userId,
      position,
      timestamp: new Date()
    });

    this.emit('cursorMoved', { sessionId, userId, position });
  }

  /**
   * Update user selection
   */
  updateSelection(sessionId: string, userId: string, selection: SelectionRange): void {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    const user = session.users.find(u => u.userId === userId);
    if (!user) {
      throw new Error('User not in session');
    }

    user.selection = selection;
    user.lastActivity = new Date();

    // Broadcast to other users
    this.broadcastToSession(sessionId, 'selection_change', {
      userId,
      selection,
      timestamp: new Date()
    });

    this.emit('selectionChanged', { sessionId, userId, selection });
  }

  /**
   * Add a comment
   */
  async addComment(sessionId: string, userId: string, comment: Partial<CollaborationComment>): Promise<CollaborationComment> {
    if (!this.config.enableCommenting) {
      throw new Error('Commenting is disabled');
    }

    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    const user = session.users.find(u => u.userId === userId);
    if (!user) {
      throw new Error('User not in session');
    }

    if (!this.hasPermission(user, 'comment')) {
      throw new Error('Insufficient permissions to comment');
    }

    const fullComment: CollaborationComment = {
      id: this.generateCommentId(),
      sessionId,
      userId,
      targetType: comment.targetType!,
      targetId: comment.targetId!,
      content: comment.content!,
      position: comment.position,
      status: 'active',
      replies: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: comment.metadata || {}
    };

    // Store comment in database
    await this.databaseService.storeComment(fullComment);

    // Notify other users
    this.broadcastToSession(sessionId, 'comment_added', {
      comment: fullComment,
      userId,
      timestamp: new Date()
    });

    this.emit('commentAdded', { sessionId, comment: fullComment });
    this.telemetryService.track('collaboration.comment.added', { sessionId, targetType: comment.targetType });

    return fullComment;
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): CollaborationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions for a user
   */
  getUserSessions(userId: string): CollaborationSession[] {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) {
      return [];
    }

    const sessions: CollaborationSession[] = [];
    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Get real-time metrics
   */
  getRealTimeMetrics(): any {
    return {
      activeSessions: this.sessions.size,
      totalUsers: this.userSessions.size,
      usersPerSession: Array.from(this.sessions.values()).map(s => ({ sessionId: s.id, userCount: s.users.length })),
      changesPerSession: Array.from(this.activeChanges.entries()).map(([sessionId, changes]) => ({ sessionId, changeCount: changes.length }))
    };
  }

  /**
   * Helper methods
   */
  private generateSessionId(): string {
    return `collab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChangeId(): string {
    return `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCommentId(): string {
    return `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getNextVersion(sessionId: string): number {
    const changes = this.activeChanges.get(sessionId) || [];
    return changes.length + 1;
  }

  private getRolePermissions(role: 'owner' | 'editor' | 'viewer'): string[] {
    switch (role) {
      case 'owner':
        return ['edit', 'comment', 'invite', 'delete', 'manage_versions', 'export'];
      case 'editor':
        return ['edit', 'comment'];
      case 'viewer':
        return ['comment'];
      default:
        return [];
    }
  }

  private hasPermission(user: Collaborator, action: string): boolean {
    return user.permissions.includes(action);
  }

  private async detectConflicts(sessionId: string, change: CollaborationChange): Promise<ChangeConflict[]> {
    const conflicts: ChangeConflict[] = [];
    const changes = this.activeChanges.get(sessionId) || [];

    // Check for edit conflicts
    const recentChanges = changes.filter(c => 
      c.target === change.target && 
      c.userId !== change.userId && 
      Date.now() - c.timestamp.getTime() < 60000 // Last minute
    );

    if (recentChanges.length > 0) {
      conflicts.push({
        id: `conflict-${change.id}`,
        type: 'edit_conflict',
        severity: 'medium',
        description: 'Another user recently modified the same target',
        proposedResolution: 'Review recent changes and merge modifications',
        alternatives: ['Override', 'Cancel', 'Merge manually']
      });
    }

    return conflicts;
  }

  private handleConflicts(sessionId: string, change: CollaborationChange): void {
    if (!change.conflicts || change.conflicts.length === 0) {
      return;
    }

    // Broadcast conflict to all users in the session
    this.broadcastToSession(sessionId, 'conflict_detected', {
      changeId: change.id,
      conflicts: change.conflicts,
      userId: change.userId,
      timestamp: new Date()
    });

    this.emit('conflictDetected', { sessionId, change });
  }

  private broadcastToSession(sessionId: string, eventType: string, data: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    const update: RealTimeUpdate = {
      type: eventType as any,
      sessionId,
      userId: data.userId,
      data,
      timestamp: new Date()
    };

    this.emit('realTimeUpdate', update);
  }

  private initializeCleanupInterval(): void {
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 60000); // Every minute
  }

  private cleanupInactiveSessions(): void {
    const now = Date.now();
    const sessionsToEnd: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity.getTime() > this.config.sessionTimeout) {
        sessionsToEnd.push(sessionId);
      }
    }

    for (const sessionId of sessionsToEnd) {
      this.endSession(sessionId).catch(error => {
        this.logger.error('Failed to cleanup inactive session', error);
      });
    }
  }
}