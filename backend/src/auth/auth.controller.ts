import { Body, Controller, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() body: any) {
    return this.authService.register(body.name, body.email, body.password);
  }

  @Post('login')
  async login(@Body() body: any, @Res({ passthrough: true }) res: any) {
    const data = await this.authService.login(body.email, body.password);

    res.cookie("token", data.token, {
      httpOnly: true,
      secure: false, // true in production https
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { message: "Login success ✅" };
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) res: any) {
    res.clearCookie("token");
    return { message: "Logged out ✅" };
  }
}
