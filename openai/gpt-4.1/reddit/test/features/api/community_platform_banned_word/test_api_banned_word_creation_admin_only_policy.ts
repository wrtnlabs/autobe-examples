import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBannedWord } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedWord";

/**
 * Validates admin-only banned word platform-wide creation policy.
 *
 * - Ensures that a new admin can register and create a new banned word/phrase for
 *   moderation, specifying unique string, reason, and active status.
 * - Verifies the word is properly persisted and its details match input (word,
 *   rationale, status), with correct audit timestamps and enforced properties.
 * - Ensures only admin users may perform this operation: non-admin/unauth
 *   attempts are denied.
 * - Checks word uniqueness enforcement: duplicate word triggers error.
 */
export async function test_api_banned_word_creation_admin_only_policy(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@admintest.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinReq = {
    email: adminEmail,
    password: adminPassword,
    superuser: true,
  } satisfies ICommunityPlatformAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinReq,
  });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin email matches join input",
    adminAuth.email,
    adminEmail,
  );
  TestValidator.predicate(
    "superuser privilege granted",
    adminAuth.superuser === true,
  );

  // 2. Create banned word as admin
  const bannedWord = RandomGenerator.alphaNumeric(10);
  const rationale = RandomGenerator.paragraph({ sentences: 2 });
  const status = true;
  const createBannedReq = {
    word: bannedWord,
    reason: rationale,
    active: status,
  } satisfies ICommunityPlatformBannedWord.ICreate;
  const created =
    await api.functional.communityPlatform.admin.bannedWords.create(
      connection,
      { body: createBannedReq },
    );
  typia.assert(created);
  TestValidator.equals("created word matches input", created.word, bannedWord);
  TestValidator.equals(
    "created rationale matches input",
    created.reason,
    rationale,
  );
  TestValidator.equals("banned word active status", created.active, status);
  // Audit: creation/updated timestamps are correct ISO strings
  TestValidator.predicate(
    "created_at is ISO date",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(created.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(created.updated_at),
  );
  TestValidator.equals(
    "deleted_at should be null or undefined",
    created.deleted_at ?? null,
    null,
  );

  // 3. Enforce word uniqueness: attempt to create duplicate
  await TestValidator.error(
    "duplicate banned word creation fails",
    async () => {
      await api.functional.communityPlatform.admin.bannedWords.create(
        connection,
        { body: createBannedReq },
      );
    },
  );

  // 4. Only admin can create: non-admin (empty headers) call should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot create banned word",
    async () => {
      await api.functional.communityPlatform.admin.bannedWords.create(
        unauthConn,
        {
          body: { ...createBannedReq, word: RandomGenerator.alphaNumeric(10) },
        },
      );
    },
  );
}
