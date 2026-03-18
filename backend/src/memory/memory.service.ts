import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class MemoryService {
  constructor(private readonly prisma: PrismaService) {}

  private toJson(value: Record<string, unknown>): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  logActivity(input: {
    userId: number;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.activityLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata ? this.toJson(input.metadata) : undefined,
      },
    });
  }

  getActivityTimeline(userId: number, limit = 50) {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    return this.prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
    });
  }

  upsertPreference(
    userId: number,
    key: string,
    value: Record<string, unknown>,
  ) {
    return this.prisma.userPreference.upsert({
      where: { userId_key: { userId, key } },
      update: { value: this.toJson(value) },
      create: { userId, key, value: this.toJson(value) },
    });
  }

  listPreferences(userId: number) {
    return this.prisma.userPreference.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  upsertWorkspaceContext(
    userId: number,
    scope: string,
    context: Record<string, unknown>,
  ) {
    return this.prisma.userWorkspaceContext.upsert({
      where: { userId_scope: { userId, scope } },
      update: { context: this.toJson(context) },
      create: { userId, scope, context: this.toJson(context) },
    });
  }

  listWorkspaceContexts(userId: number) {
    return this.prisma.userWorkspaceContext.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
