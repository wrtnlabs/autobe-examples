import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration behavior when attempting to register with a
 * username that already exists.
 *
 * This test validates the system's username uniqueness enforcement during
 * moderator registration. It verifies that the backend properly rejects
 * duplicate username registration attempts and maintains data integrity by
 * preventing multiple moderator accounts from sharing the same username.
 *
 * Test Flow:
 *
 * 1. Create the first moderator account with a unique username
 * 2. Verify successful registration with proper authentication tokens
 * 3. Attempt to register a second moderator with the same username but different
 *    email
 * 4. Validate that the system rejects the duplicate username registration
 * 5. Confirm appropriate error handling for username conflicts
 */
export async function test_api_moderator_registration_with_duplicate_username(
  connection: api.IConnection,
) {
  // Generate unique test data for the first moderator
  const sharedUsername = RandomGenerator.alphaNumeric(12);
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  // Step 1: Register the first moderator account successfully
  const firstModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: sharedUsername,
        email: firstEmail,
        password: password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  // Step 2: Validate successful first registration
  typia.assert(firstModerator);
  TestValidator.equals(
    "first moderator username matches",
    firstModerator.username,
    sharedUsername,
  );
  TestValidator.equals(
    "first moderator email matches",
    firstModerator.email,
    firstEmail,
  );
  typia.assert(firstModerator.token);

  // Step 3: Attempt to register second moderator with duplicate username
  await TestValidator.error(
    "duplicate username registration should fail",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          username: sharedUsername,
          email: secondEmail,
          password: password,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    },
  );
}
