import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard.js';
import { MemoryService } from './memory.service.js';
import { UpsertPreferenceDto } from './dto/upsert-preference.dto.js';
import { UpsertContextDto } from './dto/upsert-context.dto.js';

@UseGuards(JwtGuard)
@Controller('memory')
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get('activity')
  getActivity(@Req() req: any, @Query('limit') limit?: string) {
    return this.memoryService.getActivityTimeline(
      req.user.userId,
      Number(limit) || 50,
    );
  }

  @Get('preferences')
  getPreferences(@Req() req: any) {
    return this.memoryService.listPreferences(req.user.userId);
  }

  @Post('preferences')
  savePreference(@Req() req: any, @Body() body: UpsertPreferenceDto) {
    return this.memoryService.upsertPreference(
      req.user.userId,
      body.key,
      body.value,
    );
  }

  @Get('contexts')
  getContexts(@Req() req: any) {
    return this.memoryService.listWorkspaceContexts(req.user.userId);
  }

  @Post('contexts')
  saveContext(@Req() req: any, @Body() body: UpsertContextDto) {
    return this.memoryService.upsertWorkspaceContext(
      req.user.userId,
      body.scope,
      body.context,
    );
  }
}
