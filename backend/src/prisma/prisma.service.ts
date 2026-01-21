import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    constructor() {
        const url = process.env.DATABASE_URL;
        if (url?.startsWith('prisma://') || url?.startsWith('prisma+postgres://')) {
            super({ accelerateUrl: url });
        } else {
            // Standard postgresql:// or postgres:// connections
            super();
        }
    }

    async onModuleInit() {
        await this.$connect();
    }
}
