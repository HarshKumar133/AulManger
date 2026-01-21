import { Body, Controller, Delete, Param, Get, Post, Req, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { JwtGuard } from '../auth/jwt.guard.js';

@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @UseGuards(JwtGuard)
  @Post()
  create(@Body() body: any, @Req() req: any) {
    return this.tasksService.createTask(body.title, req.user.userId);
  }

  @UseGuards(JwtGuard)
  @Get()
  list(@Req() req: any) {
    return this.tasksService.getTasks(req.user.userId);
  }

  @UseGuards(JwtGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.tasksService.deleteTask(Number(id), req.user.userId);
  }
}
