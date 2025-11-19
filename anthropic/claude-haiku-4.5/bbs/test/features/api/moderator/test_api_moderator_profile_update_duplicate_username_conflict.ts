import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test username uniqueness constraint across moderators.
 *
 * This test validates that the discussion board system properly enforces
 * username uniqueness constraints when moderators attempt to update their
 * profiles. The scenario covers the critical business rule: each moderator must
 * have a unique username across all moderator accounts, and duplicate username
 * updates should be rejected.
 *
 * Test flow:
 *
 * 1. Register first moderator with unique username and store authentication
 *    context
 * 2. Register second moderator with different username
 * 3. Switch authentication context back to first moderator
 * 4. Attempt to update first moderator's username to match second moderator's
 *    username
 * 5. Verify API returns error indicating conflict
 * 6. Confirm first moderator's profile remains unchanged after failed update
 */
export async function test_api_moderator_profile_update_duplicate_username_conflict(
  connection: api.IConnection,
) {
  // Step 1: Register first moderator with unique username
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1Username = RandomGenerator.alphabets(10);

  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1Email,
      password: "TestPassword123!",
      username: moderator1Username,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator1);
  TestValidator.equals(
    "moderator1 username created",
    moderator1.username,
    moderator1Username,
  );

  // Store moderator1's token for later use
  const moderator1Token = moderator1.token.access;

  // Step 2: Register second moderator with different username
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2Username = RandomGenerator.alphabets(10);

  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator2Email,
      password: "TestPassword123!",
      username: moderator2Username,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator2);
  TestValidator.equals(
    "moderator2 username created",
    moderator2.username,
    moderator2Username,
  );
  TestValidator.notEquals(
    "moderator usernames are different",
    moderator1Username,
    moderator2Username,
  );

  // Step 3: Switch connection context back to first moderator by restoring their token
  const moderator1Connection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: moderator1Token,
    },
  };

  // Step 4: Attempt to update moderator1's username to moderator2's username (should fail)
  await TestValidator.error(
    "duplicate username update should fail with conflict",
    async () => {
      await api.functional.discussionBoard.moderator.profile.update(
        moderator1Connection,
        {
          body: {
            username: moderator2Username,
          } satisfies IDiscussionBoardUser.IUpdate,
        },
      );
    },
  );

  // Step 5: Verify moderator1's profile remained unchanged after the failed update
  // Re-authenticate moderator1 with original credentials to verify no changes persisted
  const moderator1Verified = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: moderator1Email,
        password: "TestPassword123!",
        username: moderator1Username,
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(moderator1Verified);
  TestValidator.equals(
    "moderator1 username unchanged after conflict",
    moderator1Verified.username,
    moderator1Username,
  );
}
