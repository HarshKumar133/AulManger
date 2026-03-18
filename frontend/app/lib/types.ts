export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  completed: boolean;
  priority: TaskPriority;
  dueDate?: string | null;
  projectId?: number | null;
  parentTaskId?: number | null;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface Project {
  id: number;
  name: string;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface DashboardContext {
  search: string;
  status: 'all' | 'pending' | 'completed';
  priority: 'all' | TaskPriority;
  includeArchived?: boolean;
  projectId?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'title';
  sortOrder?: 'asc' | 'desc';
  view?: 'stream' | 'compact';
}

export interface AiSession {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessageAt?: string | null;
}

export interface AiMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface AiSessionMessagesResponse {
  session: {
    id: number;
    title: string;
    createdAt: string;
    updatedAt: string;
  };
  messages: AiMessage[];
}

export interface AiQueryResponse {
  sessionId: number;
  answer: string;
  modelUsed: string;
  usedFallback: boolean;
  contextStats: {
    projectCount: number;
    activeTaskCount: number;
    completedTaskCount: number;
    pendingTaskCount: number;
    archivedTaskCount: number;
    overdueTaskCount: number;
  };
}

export interface AiStatusResponse {
  configured: boolean;
  model: string;
  fallbackEnabled: boolean;
}
