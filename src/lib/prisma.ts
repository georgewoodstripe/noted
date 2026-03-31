import path from 'path'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from '../generated/prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: InstanceType<typeof PrismaClient> }

function createPrismaClient() {
  const url = process.env.TURSO_DATABASE_URL ?? `file:${path.resolve(process.cwd(), 'dev.db')}`
  const authToken = process.env.TURSO_AUTH_TOKEN
  const adapter = new PrismaLibSql({ url, authToken })
  return new PrismaClient({ adapter } as never)
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
