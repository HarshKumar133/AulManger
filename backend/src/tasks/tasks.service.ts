import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  createTask(title: string, userId: number) {
    return this.prisma.task.create({
      data: { title, userId },
    });
  }

  getTasks(userId: number) {
    return this.prisma.task.findMany({
      where: { userId },
    });
  }

  deleteTask(taskId: number, userId: number) {
    return this.prisma.task.deleteMany({
      where: { id: taskId, userId },
    });
  }
}
