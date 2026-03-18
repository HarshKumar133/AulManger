import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MemoryService } from '../memory/memory.service.js';
import { QueryAiDto } from './dto/query-ai.dto.js';

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

type ContextBundle = {
  generatedAt: string;
  overview: {
    projectCount: number;
    activeTaskCount: number;
    completedTaskCount: number;
    pendingTaskCount: number;
    archivedTaskCount: number;
    overdueTaskCount: number;
  };
  projects: Array<{ id: number; name: string; color: string | null; updatedAt: Date }>;
  tasks: Array<{
    id: number;
    title: string;
    description: string;
    completed: boolean;
    priority: string;
    dueDate: Date | null;
    updatedAt: Date;
    projectId: number | null;
    projectName: string | null;
  }>;
  recentActivity: Array<{
    action: string;
    entityType: string;
    entityId: string;
    createdAt: Date;
  }>;
  workspaceContexts: Array<{ scope: string; updatedAt: Date }>;
  preferences: Array<{ key: string; updatedAt: Date }>;
};

type GenerateAnswerResult = {
  answer: string;
  modelUsed: string;
  usedFallback: boolean;
};

@Injectable()
export class AiService {
  private geminiBackoffUntil = 0;
  private geminiBackoffReason = '';

  getStatus() {
    const configured = Boolean(process.env.GEMINI_API_KEY);
    return {
      configured,
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      fallbackEnabled: true,
      backoffUntil: this.geminiBackoffUntil || null,
    };
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly memoryService: MemoryService,
  ) {}

  async listSessions(userId: number) {
    const sessions = await this.prisma.aiConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    return sessions.map((session) => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messageCount: session._count.messages,
      lastMessageAt: session.messages[0]?.createdAt ?? null,
    }));
  }

  createSession(userId: number, title?: string) {
    const safeTitle = this.buildSessionTitle(title || 'New AI Session');
    return this.prisma.aiConversation.create({
      data: { userId, title: safeTitle },
    });
  }

  async getSessionMessages(userId: number, sessionId: number) {
    const session = await this.getOwnedSession(userId, sessionId);

    const messages = await this.prisma.aiMessage.findMany({
      where: { conversationId: session.id, userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    return {
      session: {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      messages,
    };
  }

  async deleteSession(userId: number, sessionId: number) {
    await this.getOwnedSession(userId, sessionId);

    await this.prisma.aiConversation.delete({
      where: { id: sessionId },
    });

    await this.memoryService.logActivity({
      userId,
      action: 'ai.session.deleted',
      entityType: 'ai-session',
      entityId: String(sessionId),
    });

    return { success: true };
  }

  async query(userId: number, input: QueryAiDto) {
    const question = input.question.trim();
    if (!question) {
      throw new BadRequestException('Question is required');
    }

    const session = input.sessionId
      ? await this.getOwnedSession(userId, input.sessionId)
      : await this.prisma.aiConversation.create({
          data: {
            userId,
            title: this.buildSessionTitle(question),
          },
        });

    const recentMessages = await this.prisma.aiMessage.findMany({
      where: { conversationId: session.id, userId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        role: true,
        content: true,
      },
    });

    const context = await this.buildContextBundle(
      userId,
      input.maxContextTasks ?? 120,
    );
    const aiResult = await this.generateAnswer(
      question,
      context,
      recentMessages.reverse(),
    );

    await this.prisma.$transaction([
      this.prisma.aiMessage.create({
        data: {
          userId,
          conversationId: session.id,
          role: 'user',
          content: question,
        },
      }),
      this.prisma.aiMessage.create({
        data: {
          userId,
          conversationId: session.id,
          role: 'assistant',
          content: aiResult.answer,
          contextSnapshot: {
            projectCount: context.overview.projectCount,
            activeTaskCount: context.overview.activeTaskCount,
            completedTaskCount: context.overview.completedTaskCount,
            archivedTaskCount: context.overview.archivedTaskCount,
            overdueTaskCount: context.overview.overdueTaskCount,
            generatedAt: context.generatedAt,
            modelUsed: aiResult.modelUsed,
            usedFallback: aiResult.usedFallback,
          },
        },
      }),
      this.prisma.aiConversation.update({
        where: { id: session.id },
        data: { updatedAt: new Date() },
      }),
    ]);

    await this.memoryService.logActivity({
      userId,
      action: 'ai.query',
      entityType: 'ai-session',
      entityId: String(session.id),
      metadata: {
        questionPreview: this.truncate(question, 140),
      },
    });

    return {
      sessionId: session.id,
      answer: aiResult.answer,
      contextStats: context.overview,
      modelUsed: aiResult.modelUsed,
      usedFallback: aiResult.usedFallback,
    };
  }

  private async getOwnedSession(userId: number, sessionId: number) {
    if (!Number.isFinite(sessionId)) {
      throw new BadRequestException('Invalid session id');
    }

    const session = await this.prisma.aiConversation.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  private async buildContextBundle(userId: number, maxContextTasks: number): Promise<ContextBundle> {
    const safeTaskLimit = Math.min(Math.max(maxContextTasks, 20), 300);

    const [
      projects,
      activeTasks,
      archivedTaskCount,
      overdueTaskCount,
      recentActivity,
      contexts,
      preferences,
    ] = await Promise.all([
      this.prisma.project.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          color: true,
          updatedAt: true,
        },
      }),
      this.prisma.task.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        orderBy: { updatedAt: 'desc' },
        take: safeTaskLimit,
        select: {
          id: true,
          title: true,
          description: true,
          completed: true,
          priority: true,
          dueDate: true,
          projectId: true,
          updatedAt: true,
        },
      }),
      this.prisma.task.count({
        where: {
          userId,
          deletedAt: { not: null },
        },
      }),
      this.prisma.task.count({
        where: {
          userId,
          deletedAt: null,
          completed: false,
          dueDate: { lt: new Date() },
        },
      }),
      this.memoryService.getActivityTimeline(userId, 20),
      this.memoryService.listWorkspaceContexts(userId),
      this.memoryService.listPreferences(userId),
    ]);

    const projectNameById = new Map(
      projects.map((project) => [project.id, project.name]),
    );
    const completedTaskCount = activeTasks.filter(
      (task) => task.completed,
    ).length;

    return {
      generatedAt: new Date().toISOString(),
      overview: {
        projectCount: projects.length,
        activeTaskCount: activeTasks.length,
        completedTaskCount,
        pendingTaskCount: activeTasks.length - completedTaskCount,
        archivedTaskCount,
        overdueTaskCount,
      },
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        color: project.color,
        updatedAt: project.updatedAt,
      })),
      tasks: activeTasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: this.truncate(task.description || '', 220),
        completed: task.completed,
        priority: task.priority,
        dueDate: task.dueDate,
        updatedAt: task.updatedAt,
        projectId: task.projectId,
        projectName: task.projectId
          ? projectNameById.get(task.projectId) || null
          : null,
      })),
      recentActivity: recentActivity.map((entry) => ({
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        createdAt: entry.createdAt,
      })),
      workspaceContexts: contexts.slice(0, 12).map((context) => ({
        scope: context.scope,
        updatedAt: context.updatedAt,
      })),
      preferences: preferences.slice(0, 12).map((preference) => ({
        key: preference.key,
        updatedAt: preference.updatedAt,
      })),
    };
  }

  private async generateAnswer(
    question: string,
    context: ContextBundle,
    history: Array<{ role: string; content: string }>,
  ): Promise<GenerateAnswerResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const maxOutputTokens = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS || 900);

    if (!apiKey) {
      return {
        answer: this.buildFallbackAnswer(
          question,
          context,
          'Gemini API key is missing. Showing local contextual analysis.',
        ),
        modelUsed: 'local-fallback',
        usedFallback: true,
      };
    }

    const historyText = history
      .map(
        (item) =>
          `${item.role.toUpperCase()}: ${this.truncate(item.content, 400)}`,
      )
      .join('\n');

    const prompt = [
      'You are an analytics assistant for a task management workspace.',
      'Only answer using the supplied JSON context and conversation history.',
      'If data is missing, explicitly say you do not have that information in the current workspace context.',
      'Keep answers practical and concise. Prefer bullets when listing items.',
      'Include an "Evidence" section with IDs when referencing specific projects or tasks.',
      '',
      `Question: ${question}`,
      '',
      historyText
        ? `Recent Conversation:\n${historyText}`
        : 'Recent Conversation: none',
      '',
      `Workspace Context JSON:\n${JSON.stringify(context)}`,
    ].join('\n');

    const candidateModels = Array.from(
      new Set([
        model,
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-1.5-flash',
      ]),
    );

    if (Date.now() < this.geminiBackoffUntil) {
      return {
        answer: this.buildFallbackAnswer(
          question,
          context,
          this.geminiBackoffReason ||
            'Gemini is temporarily paused due to quota limits. Using local contextual mode.',
        ),
        modelUsed: 'local-fallback',
        usedFallback: true,
      };
    }

    let lastError = '';

    for (const selectedModel of candidateModels) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens,
            },
          }),
        },
      );

      const payload = (await response.json()) as GeminiResponse;

      if (response.ok) {
        const answer =
          payload.candidates?.[0]?.content?.parts
            ?.map((part) => part.text || '')
            .join('\n')
            .trim() || '';

        if (answer) {
          return {
            answer,
            modelUsed: selectedModel,
            usedFallback: false,
          };
        }
      }

      const message = payload.error?.message || 'Gemini request failed';
      lastError = this.summarizeGeminiError(message);

      if (this.isQuotaOrBillingError(message)) {
        this.geminiBackoffUntil = Date.now() + this.getGeminiBackoffMs();
        this.geminiBackoffReason =
          'Gemini quota limit reached. Using local contextual mode until quota resets.';
      }

      const modelNotSupported = /not found|not supported/i.test(message);
      if (!modelNotSupported) {
        break;
      }
    }

    if (!lastError) {
      throw new ServiceUnavailableException('Gemini returned an empty answer');
    }

    return {
      answer: this.buildFallbackAnswer(
        question,
        context,
        `Gemini is temporarily unavailable (${lastError}). Using local contextual mode.`,
      ),
      modelUsed: 'local-fallback',
      usedFallback: true,
    };
  }

  private isQuotaOrBillingError(message: string): boolean {
    const normalized = message.toLowerCase();
    return (
      normalized.includes('quota exceeded') ||
      normalized.includes('rate limit') ||
      normalized.includes('billing') ||
      normalized.includes('resource_exhausted')
    );
  }

  private summarizeGeminiError(message: string): string {
    const normalized = message.toLowerCase();

    if (normalized.includes('quota exceeded') || normalized.includes('rate limit')) {
      return 'quota exceeded';
    }
    if (normalized.includes('billing')) {
      return 'billing required';
    }
    if (normalized.includes('not found') || normalized.includes('not supported')) {
      return 'model unavailable';
    }

    return this.truncate(message.replace(/\s+/g, ' ').trim(), 120);
  }

  private getGeminiBackoffMs(): number {
    const parsed = Number(process.env.GEMINI_BACKOFF_MS || 300000);
    if (Number.isNaN(parsed) || parsed < 10000) {
      return 300000;
    }
    return parsed;
  }

  private buildFallbackAnswer(
    question: string,
    context: ContextBundle,
    reason: string,
  ): string {
    const lowerQuestion = question.toLowerCase();
    const overdueHigh = context.tasks.filter(
      (task) =>
        !task.completed &&
        task.priority === 'high' &&
        task.dueDate &&
        task.dueDate.getTime() < Date.now(),
    );
    const topPending = context.tasks
      .filter((task) => !task.completed)
      .slice(0, 5)
      .map((task) => `- #${task.id} ${task.title} (${task.priority})`)
      .join('\n');

    const lines = [
      `${reason}`,
      '',
      'Workspace summary:',
      `- Projects: ${context.overview.projectCount}`,
      `- Active tasks: ${context.overview.activeTaskCount}`,
      `- Completed tasks: ${context.overview.completedTaskCount}`,
      `- Pending tasks: ${context.overview.pendingTaskCount}`,
      `- Archived tasks: ${context.overview.archivedTaskCount}`,
      `- Overdue tasks: ${context.overview.overdueTaskCount}`,
    ];

    if (/overdue|high[- ]priority/.test(lowerQuestion)) {
      lines.push('', 'Overdue high-priority tasks:');
      lines.push(
        overdueHigh.length
          ? overdueHigh
              .slice(0, 10)
              .map((task) => `- #${task.id} ${task.title} (${task.projectName || 'No project'})`)
              .join('\n')
          : '- None found in current workspace context.',
      );
    } else {
      lines.push('', 'Top pending tasks:');
      lines.push(topPending || '- None found in current workspace context.');
    }

    lines.push('', 'Evidence:');
    lines.push(`- Generated from ${context.tasks.length} tasks and ${context.projects.length} projects in your DB context`);

    return lines.join('\n');
  }

  private buildSessionTitle(seed: string) {
    return (
      this.truncate(seed.replace(/\s+/g, ' ').trim(), 80) || 'New AI Session'
    );
  }

  private truncate(value: string, limit: number) {
    if (value.length <= limit) {
      return value;
    }
    return `${value.slice(0, limit - 3)}...`;
  }
}
