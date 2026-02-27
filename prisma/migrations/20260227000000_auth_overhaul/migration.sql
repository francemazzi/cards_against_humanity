-- Migration: auth_overhaul
-- Switch from OpenAI-key-based auth to username/password with cookie sessions
-- OpenAI key becomes optional (set after login)

-- Step 1: Add new columns as nullable first
ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "openaiKeyEncrypted" TEXT;

-- Step 2: Make existing OpenAI fields nullable
ALTER TABLE "User" ALTER COLUMN "openaiKeyHash" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "openaiKeyLast4" DROP NOT NULL;

-- Step 3: Migrate existing users - generate username from nickname or id
UPDATE "User" SET
  "username" = COALESCE("nickname", 'user_' || LEFT("id", 8)),
  "passwordHash" = '$2b$10$placeholder_hash_users_must_reregister'
WHERE "username" IS NULL;

-- Step 4: Handle duplicate usernames before adding unique constraint
-- Append suffix to duplicates
WITH duplicates AS (
  SELECT "id", "username",
    ROW_NUMBER() OVER (PARTITION BY "username" ORDER BY "createdAt") as rn
  FROM "User"
)
UPDATE "User" SET "username" = "User"."username" || '_' || duplicates.rn
FROM duplicates
WHERE "User"."id" = duplicates."id" AND duplicates.rn > 1;

-- Step 5: Make username and passwordHash NOT NULL
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "passwordHash" SET NOT NULL;

-- Step 6: Add unique constraint and index for username
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_username_idx" ON "User"("username");

-- Step 7: Drop the old openaiKeyHash index (the unique constraint still exists)
DROP INDEX IF EXISTS "User_openaiKeyHash_idx";

-- Step 8: Fix updatedAt to use auto-update (handled by Prisma @updatedAt)
