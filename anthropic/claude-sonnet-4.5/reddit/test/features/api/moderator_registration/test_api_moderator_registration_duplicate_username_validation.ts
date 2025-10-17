import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test moderator registration duplicate username validation.
 *
 * This test validates that the moderator registration endpoint properly
 * enforces username uniqueness across the platform. First, a moderator account
 * is created with a specific username. Then, an attempt is made to register
 * another moderator with the same username but a different email address. The
 * test verifies that the second registration fails, confirming the global
 * uniqueness constraint on usernames in the reddit_like_moderators table is
 * working correctly.
 *
 * Workflow:
 *
 * 1. Generate unique username and first moderator credentials
 * 2. Register first moderator successfully
 * 3. Verify first registration returns proper authorization data
 * 4. Attempt to register second moderator with same username but different email
 * 5. Verify second registration fails due to duplicate username
 */
export async function test_api_moderator_registration_duplicate_username_validation(
  connection: api.IConnection,
) {
  // Generate unique username to test with
  const sharedUsername = RandomGenerator.alphaNumeric(10);

  // Register first moderator with the username
  const firstModeratorData = {
    username: sharedUsername,
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeModerator.ICreate;

  const firstModerator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: firstModeratorData,
    });

  // Validate first registration succeeded
  typia.assert(firstModerator);
  TestValidator.equals(
    "first moderator username matches",
    firstModerator.username,
    sharedUsername,
  );
  TestValidator.equals(
    "first moderator email matches",
    firstModerator.email,
    firstModeratorData.email,
  );

  // Attempt to register second moderator with same username but different email
  await TestValidator.error(
    "duplicate username registration should fail",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          username: sharedUsername,
          email: typia.random<string & tags.Format<"email">>(),
          password: typia.random<string & tags.MinLength<8>>(),
        } satisfies IRedditLikeModerator.ICreate,
      });
    },
  );
}
