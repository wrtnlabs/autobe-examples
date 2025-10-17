import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBannedWord } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedWord";

/**
 * Validate permanent deletion of a banned word by an administrator.
 *
 * This test ensures that when an admin permanently deletes a banned word entry,
 * enforcement of that word is immediately lifted platform-wide, and it can be
 * re-added or used in content without restriction. Steps are:
 *
 * 1. Admin registration (join).
 * 2. Add a banned word using the admin API.
 * 3. Delete the banned word via the erase API.
 * 4. Attempt to re-add the same banned word to verify enforcement is lifted and
 *    creation is allowed.
 */
export async function test_api_banned_word_permanent_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create a random banned word
  const bannedWordText = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 4,
    wordMax: 12,
  });
  const bannedWord =
    await api.functional.communityPlatform.admin.bannedWords.create(
      connection,
      {
        body: {
          word: bannedWordText,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          active: true,
        } satisfies ICommunityPlatformBannedWord.ICreate,
      },
    );
  typia.assert(bannedWord);
  TestValidator.equals(
    "banned word is enforced and created",
    bannedWord.word,
    bannedWordText,
  );

  // 3. Permanently delete the banned word
  await api.functional.communityPlatform.admin.bannedWords.erase(connection, {
    bannedWordId: bannedWord.id,
  });
  // No exception means deletion succeeded.

  // 4. Attempt to add the same banned word again. It should now be allowed as enforcement is lifted.
  const newBan =
    await api.functional.communityPlatform.admin.bannedWords.create(
      connection,
      {
        body: {
          word: bannedWordText,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          active: true,
        } satisfies ICommunityPlatformBannedWord.ICreate,
      },
    );
  typia.assert(newBan);
  TestValidator.equals(
    "banned word can be re-added after permanent deletion",
    newBan.word,
    bannedWordText,
  );
}
