import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { MemoryModule } from './memory/memory.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { AiModule } from './ai/ai.module.js';

@Module({
  imports: [
    AuthModule,
    TasksModule,
    PrismaModule,
    MemoryModule,
    ProjectsModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
