import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MemoryService } from '../memory/memory.service.js';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private memoryService: MemoryService,
  ) {}

  private toOptionalNumber(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const num = Number(value);
    return Number.isNaN(num) ? undefined : num;
  }

  private async validateProjectOwnership(
    projectId: number | undefined,
    userId: number,
  ) {
    if (!projectId) {
      return;
    }

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });

    if (!project) {
      throw new BadRequestException('Invalid projectId for this user');
    }
  }

  private async validateParentTaskOwnership(
    parentTaskId: number | undefined,
    userId: number,
    taskId?: number,
  ) {
    if (!parentTaskId) {
      return;
    }

    if (taskId && parentTaskId === taskId) {
      throw new BadRequestException('A task cannot be a parent of itself');
    }

    const parentTask = await this.prisma.task.findFirst({
      where: { id: parentTaskId, userId, deletedAt: null },
      select: { id: true },
    });

    if (!parentTask) {
      throw new BadRequestException('Invalid parentTaskId for this user');
    }
  }

  async createTask(data: any, userId: number) {
    const projectId = this.toOptionalNumber(data.projectId);
    const parentTaskId = this.toOptionalNumber(data.parentTaskId);

    await this.validateProjectOwnership(projectId, userId);
    await this.validateParentTaskOwnership(parentTaskId, userId);

    const createdTask = await this.prisma.task.create({
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        projectId,
        parentTaskId,
        userId,
      },
    });

    await this.memoryService.logActivity({
      userId,
      action: 'task.created',
      entityType: 'task',
      entityId: String(createdTask.id),
      metadata: {
        priority: createdTask.priority,
        hasDueDate: Boolean(createdTask.dueDate),
        projectId: createdTask.projectId,
        parentTaskId: createdTask.parentTaskId,
      },
    });

    return createdTask;
  }

  async getTasks(userId: number, query: any) {
    const { search, status, priority, includeArchived, projectId } = query;
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
    const sortBy = [
      'createdAt',
      'updatedAt',
      'dueDate',
      'priority',
      'title',
    ].includes(query.sortBy)
      ? query.sortBy
      : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    await this.validateProjectOwnership(
      this.toOptionalNumber(projectId),
      userId,
    );

    return this.prisma.task.findMany({
      where: {
        userId,
        ...(includeArchived === 'true' ? {} : { deletedAt: null }),
        ...(status === 'completed'
          ? { completed: true }
          : status === 'pending'
            ? { completed: false }
            : {}),
        ...(priority ? { priority } : {}),
        ...(projectId ? { projectId: Number(projectId) } : {}),
        ...(search
          ? {
              OR: [
                {
                  title: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  description: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });
  }

  async updateTask(taskId: number, userId: number, data: any) {
    const existingTask = await this.prisma.task.findFirst({
      where: { id: taskId, userId, deletedAt: null },
      select: { id: true, completed: true, priority: true },
    });

    if (!existingTask) {
      throw new NotFoundException('Task not found');
    }

    const projectId = this.toOptionalNumber(data.projectId);
    const parentTaskId = this.toOptionalNumber(data.parentTaskId);

    await this.validateProjectOwnership(projectId, userId);
    await this.validateParentTaskOwnership(parentTaskId, userId, taskId);

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        ...(projectId !== undefined ? { projectId } : {}),
        ...(parentTaskId !== undefined ? { parentTaskId } : {}),
      },
    });

    await this.memoryService.logActivity({
      userId,
      action: 'task.updated',
      entityType: 'task',
      entityId: String(taskId),
      metadata: {
        previousCompleted: existingTask.completed,
        nextCompleted: updatedTask.completed,
        previousPriority: existingTask.priority,
        nextPriority: updatedTask.priority,
      },
    });

    return updatedTask;
  }

  async deleteTask(taskId: number, userId: number) {
    const result = await this.prisma.task.updateMany({
      where: { id: taskId, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (result.count === 0) {
      throw new NotFoundException('Task not found');
    }

    await this.memoryService.logActivity({
      userId,
      action: 'task.archived',
      entityType: 'task',
      entityId: String(taskId),
    });

    return result;
  }

  async restoreTask(taskId: number, userId: number) {
    const result = await this.prisma.task.updateMany({
      where: { id: taskId, userId, deletedAt: { not: null } },
      data: { deletedAt: null },
    });

    if (result.count === 0) {
      throw new NotFoundException('Archived task not found');
    }

    await this.memoryService.logActivity({
      userId,
      action: 'task.restored',
      entityType: 'task',
      entityId: String(taskId),
    });

    return result;
  }

  async bulkUpdateTasks(taskIds: number[], userId: number, data: any) {
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      throw new BadRequestException('taskIds must be a non-empty array');
    }

    const result = await this.prisma.task.updateMany({
      where: {
        id: { in: taskIds },
        userId,
        deletedAt: null,
      },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });

    await this.memoryService.logActivity({
      userId,
      action: 'task.bulk_updated',
      entityType: 'task',
      entityId: 'bulk',
      metadata: { updatedCount: result.count, taskIds },
    });

    return result;
  }

  async bulkDeleteTasks(taskIds: number[], userId: number) {
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      throw new BadRequestException('taskIds must be a non-empty array');
    }

    const result = await this.prisma.task.updateMany({
      where: {
        id: { in: taskIds },
        userId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    await this.memoryService.logActivity({
      userId,
      action: 'task.bulk_archived',
      entityType: 'task',
      entityId: 'bulk',
      metadata: { archivedCount: result.count, taskIds },
    });

    return result;
  }
}
