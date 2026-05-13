-- CreateTable
CREATE TABLE "linked_accounts" (
    "id" TEXT NOT NULL,
    "twitch_id" TEXT NOT NULL,
    "twitch_login" TEXT NOT NULL,
    "riot_puuid" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "cached_tier" TEXT,
    "cached_rank" TEXT,
    "cached_lp" INTEGER,
    "rank_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "linked_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "linked_accounts_twitch_id_key" ON "linked_accounts"("twitch_id");
