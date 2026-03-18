import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';
import { MemoryModule } from '../memory/memory.module.js';

@Module({
  imports: [MemoryModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
