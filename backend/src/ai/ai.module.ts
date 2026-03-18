import { Module } from '@nestjs/common';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { MemoryModule } from '../memory/memory.module.js';

@Module({
  imports: [MemoryModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
