import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MemoryService } from '../memory/memory.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memoryService: MemoryService,
  ) {}

  async list(userId: number) {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(userId: number, body: CreateProjectDto) {
    const existing = await this.prisma.project.findFirst({
      where: {
        userId,
        name: body.name,
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Project name already exists');
    }

    const project = await this.prisma.project.create({
      data: {
        userId,
        name: body.name,
        color: body.color || '#1f2937',
      },
    });

    await this.memoryService.logActivity({
      userId,
      action: 'project.created',
      entityType: 'project',
      entityId: String(project.id),
      metadata: {
        name: project.name,
      },
    });

    return project;
  }

  async update(projectId: number, userId: number, body: UpdateProjectDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true, name: true, color: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: body,
    });

    await this.memoryService.logActivity({
      userId,
      action: 'project.updated',
      entityType: 'project',
      entityId: String(projectId),
      metadata: {
        previousName: project.name,
        nextName: updated.name,
      },
    });

    return updated;
  }

  async remove(projectId: number, userId: number) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.prisma.$transaction([
      this.prisma.task.updateMany({
        where: { projectId, userId },
        data: { projectId: null },
      }),
      this.prisma.project.delete({
        where: { id: projectId },
      }),
    ]);

    await this.memoryService.logActivity({
      userId,
      action: 'project.deleted',
      entityType: 'project',
      entityId: String(projectId),
    });

    return { success: true };
  }
}
