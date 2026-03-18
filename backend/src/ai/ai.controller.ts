import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard.js';
import { AiService } from './ai.service.js';
import { QueryAiDto } from './dto/query-ai.dto.js';
import { CreateAiSessionDto } from './dto/create-ai-session.dto.js';

@UseGuards(JwtGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('status')
  status() {
    return this.aiService.getStatus();
  }

  @Post('query')
  query(@Req() req: any, @Body() body: QueryAiDto) {
    return this.aiService.query(req.user.userId, body);
  }

  @Get('sessions')
  listSessions(@Req() req: any) {
    return this.aiService.listSessions(req.user.userId);
  }

  @Post('sessions')
  createSession(@Req() req: any, @Body() body: CreateAiSessionDto) {
    return this.aiService.createSession(req.user.userId, body.title);
  }

  @Get('sessions/:id/messages')
  getSessionMessages(@Req() req: any, @Param('id') id: string) {
    return this.aiService.getSessionMessages(req.user.userId, Number(id));
  }

  @Delete('sessions/:id')
  deleteSession(@Req() req: any, @Param('id') id: string) {
    return this.aiService.deleteSession(req.user.userId, Number(id));
  }
}
