import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that username updates maintain uniqueness constraints across all
 * moderators.
 *
 * This test validates the uniqueness constraint enforcement for moderator
 * usernames during update operations. It verifies that:
 *
 * 1. Attempting to update a moderator's username to one that already exists fails
 * 2. Updating to a unique username succeeds
 * 3. The uniqueness constraint is properly enforced at the database level
 *
 * Process:
 *
 * 1. Create two moderator accounts with different unique usernames
 * 2. Attempt to update second moderator's username to match the first (should
 *    fail)
 * 3. Update second moderator's username to a new unique value (should succeed)
 * 4. Verify the successful update reflects the new username
 */
export async function test_api_moderator_username_update_uniqueness(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account with unique username
  const firstModeratorUsername = `mod_${RandomGenerator.alphaNumeric(12)}`;
  const firstModeratorEmail = typia.random<string & tags.Format<"email">>();

  const firstModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: firstModeratorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        username: firstModeratorUsername,
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(firstModerator);

  // Step 2: Create second moderator account with different unique username
  const secondModeratorUsername = `mod_${RandomGenerator.alphaNumeric(12)}`;
  const secondModeratorEmail = typia.random<string & tags.Format<"email">>();

  const secondModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: secondModeratorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        username: secondModeratorUsername,
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(secondModerator);

  // Step 3: Attempt to update second moderator's username to match first moderator's username
  // This MUST fail due to uniqueness constraint violation
  await TestValidator.error(
    "updating username to existing username should fail",
    async () => {
      await api.functional.discussionBoard.moderator.moderators.update(
        connection,
        {
          moderatorId: secondModerator.id,
          body: {
            username: firstModeratorUsername,
          } satisfies IDiscussionBoardModerator.IUpdate,
        },
      );
    },
  );

  // Step 4: Update second moderator's username to a new unique value
  // This SHOULD succeed
  const newUniqueUsername = `mod_${RandomGenerator.alphaNumeric(12)}`;

  const updatedModerator: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorId: secondModerator.id,
        body: {
          username: newUniqueUsername,
        } satisfies IDiscussionBoardModerator.IUpdate,
      },
    );
  typia.assert(updatedModerator);

  // Step 5: Verify the username was successfully updated
  TestValidator.equals(
    "updated username matches new unique username",
    updatedModerator.username,
    newUniqueUsername,
  );

  // Verify the username is different from the original
  TestValidator.notEquals(
    "updated username differs from original username",
    updatedModerator.username,
    secondModeratorUsername,
  );
}
