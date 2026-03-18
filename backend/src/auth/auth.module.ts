import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { MemoryModule } from '../memory/memory.module.js';

@Module({
  imports: [MemoryModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
