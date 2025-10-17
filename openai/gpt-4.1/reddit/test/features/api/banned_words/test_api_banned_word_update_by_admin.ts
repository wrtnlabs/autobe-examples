import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBannedWord } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedWord";
import type { ICommunityPlatformBannedWords } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedWords";

/**
 * Validate that a platform administrator can update a banned word entry,
 * including changing: the word, enforcement status, and rationale text. This
 * test covers the end-to-end workflow from admin onboarding to update:
 *
 * 1. Register admin
 * 2. Create a banned word (with word, reason, and initial active flag)
 * 3. Update the banned word by changing its value, its 'active' status, and
 *    providing a different (or null) reason
 * 4. Verify that the updated DTO reflects new values, new timestamps, and that
 *    audit compliance fields are correct
 */
export async function test_api_banned_word_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2. Create banned word entry
  const bannedWordCreate = {
    word: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 14,
    }).replace(/\s/g, ""),
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    active: true,
  } satisfies ICommunityPlatformBannedWord.ICreate;
  const bannedWord: ICommunityPlatformBannedWord =
    await api.functional.communityPlatform.admin.bannedWords.create(
      connection,
      {
        body: bannedWordCreate,
      },
    );
  typia.assert(bannedWord);
  TestValidator.equals(
    "banned word (pre-update) matches create",
    bannedWord.word,
    bannedWordCreate.word,
  );
  TestValidator.equals(
    "banned word (pre-update) has correct reason",
    bannedWord.reason,
    bannedWordCreate.reason,
  );
  TestValidator.equals(
    "banned word (pre-update) is active",
    bannedWord.active,
    true,
  );

  // 3. Update banned word: change word, flip active, and provide null reason (test all update fields)
  const newWord = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 6,
    wordMax: 14,
  }).replace(/\s/g, "");
  const newActive = !bannedWord.active;
  const updateInput = {
    word: newWord,
    reason: null,
    active: newActive,
  } satisfies ICommunityPlatformBannedWords.IUpdate;
  const updated: ICommunityPlatformBannedWords =
    await api.functional.communityPlatform.admin.bannedWords.update(
      connection,
      {
        bannedWordId: bannedWord.id,
        body: updateInput,
      },
    );
  typia.assert(updated);
  // New word
  TestValidator.equals(
    "banned word (post-update) reflects new word",
    updated.word,
    newWord,
  );
  // Active status changed
  TestValidator.equals(
    "banned word (post-update) reflects updated active",
    updated.active,
    newActive,
  );
  // Reason nullification
  TestValidator.equals(
    "banned word (post-update) has null reason",
    updated.reason,
    null,
  );
  // ID and audit fields should remain correct and updated
  TestValidator.equals(
    "banned word ID remains constant after update",
    updated.id,
    bannedWord.id,
  );
  TestValidator.predicate(
    "updated_at timestamp is refreshed after update",
    updated.updated_at >= bannedWord.updated_at,
  );
  TestValidator.equals(
    "created_at timestamp remains constant after update",
    updated.created_at,
    bannedWord.created_at,
  );
  // deleted_at should remain unchanged (likely undefined/null as never deleted)
  TestValidator.equals(
    "deleted_at unchanged after update",
    updated.deleted_at,
    bannedWord.deleted_at,
  );
}
