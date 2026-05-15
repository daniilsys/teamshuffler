-- CreateTable
CREATE TABLE "GuildConfig" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "gameManagerRoleId" TEXT,
    "categoryId" TEXT,
    "creationChannelIds" TEXT[],
    "gameCounter" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveGame" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "gameNumber" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,
    "teamAChannelId" TEXT NOT NULL,
    "teamBChannelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActiveGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuildConfig_guildId_key" ON "GuildConfig"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "ActiveGame_categoryId_key" ON "ActiveGame"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ActiveGame_teamAChannelId_key" ON "ActiveGame"("teamAChannelId");

-- CreateIndex
CREATE UNIQUE INDEX "ActiveGame_teamBChannelId_key" ON "ActiveGame"("teamBChannelId");

-- CreateIndex
CREATE INDEX "ActiveGame_guildId_idx" ON "ActiveGame"("guildId");
