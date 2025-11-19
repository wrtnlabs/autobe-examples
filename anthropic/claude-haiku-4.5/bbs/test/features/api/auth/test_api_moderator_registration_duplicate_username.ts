import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration with a username already assigned to another
 * moderator account.
 *
 * This test verifies that the system enforces username uniqueness constraints
 * by:
 *
 * 1. Creating a first moderator account with a unique username
 * 2. Attempting to register a second moderator account with the same username
 * 3. Verifying that the duplicate username registration is rejected with an
 *    appropriate error
 *
 * This ensures usernames are properly enforced as unique identifiers in the
 * discussion board system. The test validates that business rule uniqueness
 * constraints are correctly implemented and prevent duplicate account creation
 * based on username conflicts.
 */
export async function test_api_moderator_registration_duplicate_username(
  connection: api.IConnection,
) {
  // Step 1: Register the first moderator account with a unique username
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const duplicateUsername = RandomGenerator.alphaNumeric(8);

  const firstModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: firstEmail,
        password: "SecurePass123!",
        username: duplicateUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(firstModerator);
  TestValidator.equals(
    "first moderator username matches",
    firstModerator.username,
    duplicateUsername,
  );

  // Step 2: Attempt to register a second moderator with the same username
  const secondEmail = typia.random<string & tags.Format<"email">>();

  await TestValidator.error(
    "duplicate username should be rejected",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email: secondEmail,
          password: "AnotherSecure456!",
          username: duplicateUsername, // Same username as first moderator
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    },
  );

  // Step 3: Verify that the username constraint is properly enforced
  TestValidator.predicate(
    "first moderator account was successfully created",
    firstModerator.id !== null && firstModerator.id !== undefined,
  );
}
