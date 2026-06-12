import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';

// Automatically loads variables from your local .env file
dotenv.config();

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});