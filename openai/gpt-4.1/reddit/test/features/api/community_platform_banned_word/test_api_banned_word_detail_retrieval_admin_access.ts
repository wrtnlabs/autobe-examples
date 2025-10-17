import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBannedWord } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedWord";

/**
 * Test admin-only retrieval of banned word details.
 *
 * 1. Register a new admin using the admin join endpoint with unique email and
 *    password.
 * 2. Create a new banned word entry as this admin via the admin/bannedWords API
 *    with required fields (word, reason, active status).
 * 3. Retrieve the details of this banned word using the GET API targeting its ID.
 * 4. Assert that all returned fields - word, active, reason, created_at,
 *    updated_at, deleted_at - exactly match those sent or expected, and that
 *    admin access is required.
 * 5. Validate presence and format of auditing fields (timestamps etc.).
 */
export async function test_api_banned_word_detail_retrieval_admin_access(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create banned word
  const wordBody = {
    word: RandomGenerator.name(1),
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
  } satisfies ICommunityPlatformBannedWord.ICreate;
  const created =
    await api.functional.communityPlatform.admin.bannedWords.create(
      connection,
      {
        body: wordBody,
      },
    );
  typia.assert(created);

  // 3. Retrieve banned word detail by ID
  const detail = await api.functional.communityPlatform.admin.bannedWords.at(
    connection,
    {
      bannedWordId: created.id,
    },
  );
  typia.assert(detail);

  // 4. Assert all returned fields match expectations
  TestValidator.equals("banned word ID matches", detail.id, created.id);
  TestValidator.equals("banned word matches", detail.word, wordBody.word);
  TestValidator.equals("reason matches", detail.reason, wordBody.reason);
  TestValidator.equals("active status matches", detail.active, wordBody.active);
  TestValidator.predicate(
    "created_at format is ISO 8601",
    typeof detail.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
        detail.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at format is ISO 8601",
    typeof detail.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
        detail.updated_at,
      ),
  );
  TestValidator.equals(
    "deleted_at is null (not deleted)",
    detail.deleted_at,
    null,
  );
}
