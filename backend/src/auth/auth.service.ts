import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService) { }

    async register(name: string, email: string, password: string) {
        try {
            const hashed = await bcrypt.hash(password, 10);
            const user = await this.prisma.user.create({
                data: { name, email, password: hashed },
            });
            return { id: user.id, name: user.name, email: user.email };
        } catch (error) {
            if (error.code === 'P2002') {
                throw new Error('Email already exists');
            }
            throw error;
        }
    }

    async login(email: string, password: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) throw new Error('Invalid credentials');

        const match = await bcrypt.compare(password, user.password);
        if (!match) throw new Error('Invalid credentials');

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET as string,
            { expiresIn: '7d' }
        );

        return { token };
    }
}
