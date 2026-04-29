import { PrismaClient } from "@prisma/client";

// Single instance shared across the app.
// ts-node-dev hot-reloads modules, which would create multiple connections
// without this guard.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
