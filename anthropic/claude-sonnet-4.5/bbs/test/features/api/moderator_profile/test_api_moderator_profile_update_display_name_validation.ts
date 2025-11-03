import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test display name length validation in moderator profile updates.
 *
 * This test verifies that the profile update operation correctly enforces the
 * 50-character maximum length constraint on display names. It validates both
 * rejection of oversized display names and acceptance of valid lengths.
 *
 * Test flow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Attempt update with 51+ character display name (should fail)
 * 3. Update with exactly 50 character display name (should succeed)
 * 4. Update with 25 character display name (should succeed)
 * 5. Verify all changes are persisted correctly
 */
export async function test_api_moderator_profile_update_display_name_validation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorUsername = RandomGenerator.alphaNumeric(12);
  const moderatorEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderatorPassword = RandomGenerator.alphaNumeric(16);

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        href: "https://test.example.com/moderator/join",
        referrer: "https://test.example.com/home",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(createdModerator);

  // Step 2: Test with display name exceeding 50 characters (should fail)
  const oversizedBase = RandomGenerator.paragraph({
    sentences: 20,
    wordMin: 8,
    wordMax: 12,
  });
  const oversizedDisplayName = (
    oversizedBase + RandomGenerator.alphabets(100)
  ).substring(0, 51);

  TestValidator.predicate(
    "oversized display name must be exactly 51 characters",
    oversizedDisplayName.length === 51,
  );

  await TestValidator.error(
    "display name exceeding 50 characters should be rejected",
    async () => {
      await api.functional.discussionBoard.moderator.moderators.update(
        connection,
        {
          moderatorUsername: createdModerator.username,
          body: {
            display_name: oversizedDisplayName,
          } satisfies IDiscussionBoardModerator.IUpdate,
        },
      );
    },
  );

  // Step 3: Test with exactly 50 character display name (should succeed)
  const maxLengthBase = RandomGenerator.paragraph({
    sentences: 15,
    wordMin: 5,
    wordMax: 7,
  });
  const maxLengthDisplayName = (
    maxLengthBase + RandomGenerator.alphabets(100)
  ).substring(0, 50);

  TestValidator.predicate(
    "max length display name must be exactly 50 characters",
    maxLengthDisplayName.length === 50,
  );

  const updatedWithMax: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorUsername: createdModerator.username,
        body: {
          display_name: maxLengthDisplayName,
        } satisfies IDiscussionBoardModerator.IUpdate,
      },
    );
  typia.assert(updatedWithMax);

  typia.assertGuard(updatedWithMax.display_name!);
  TestValidator.equals(
    "display name should be updated to 50 character value",
    updatedWithMax.display_name,
    maxLengthDisplayName,
  );

  // Step 4: Test with shorter display name well within limits (should succeed)
  const shortBase = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 4,
    wordMax: 6,
  });
  const shortDisplayName = (
    shortBase + RandomGenerator.alphabets(50)
  ).substring(0, 25);

  TestValidator.predicate(
    "short display name must be exactly 25 characters",
    shortDisplayName.length === 25,
  );

  const updatedWithShort: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorUsername: createdModerator.username,
        body: {
          display_name: shortDisplayName,
        } satisfies IDiscussionBoardModerator.IUpdate,
      },
    );
  typia.assert(updatedWithShort);

  typia.assertGuard(updatedWithShort.display_name!);
  TestValidator.equals(
    "display name should be updated to 25 character value",
    updatedWithShort.display_name,
    shortDisplayName,
  );
}
