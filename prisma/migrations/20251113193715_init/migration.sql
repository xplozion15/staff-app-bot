-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "discordUsername" TEXT NOT NULL,
    "motivation" TEXT NOT NULL,
    "experience" TEXT,
    "roleInterest" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "notes" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Application_createdAt_idx" ON "Application"("createdAt");
