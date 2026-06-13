import { PrismaClient } from './generated/prisma/client.ts';
import dotenv from 'dotenv';

dotenv.config();

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
