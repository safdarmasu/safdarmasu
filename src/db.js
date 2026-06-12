import { PrismaClient } from './generated/prisma/client.ts';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import dotenv from 'dotenv';

dotenv.config();

let prisma;

if (process.env.DATABASE_URL) {
  const dbUrl = new URL(process.env.DATABASE_URL);
  
  const adapter = new PrismaMariaDb({
    host: dbUrl.hostname || 'localhost',
    port: dbUrl.port ? Number(dbUrl.port) : 3306,
    user: dbUrl.username || undefined,
    password: dbUrl.password ? decodeURIComponent(dbUrl.password) : undefined,
    database: dbUrl.pathname ? dbUrl.pathname.slice(1) : undefined,
    connectionLimit: 10,
  });
  
  prisma = global.prisma || new PrismaClient({ adapter });
} else {
  prisma = global.prisma || new PrismaClient();
}

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
