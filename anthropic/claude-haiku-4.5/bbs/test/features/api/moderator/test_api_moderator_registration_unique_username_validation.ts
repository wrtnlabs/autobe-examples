import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validate that moderator usernames must be unique across the system.
 *
 * This test ensures that the discussion_board_moderators table enforces a
 * unique constraint on the username field. It registers a moderator with a
 * specific username successfully, then attempts to register another moderator
 * with the same username, which should fail with an error indicating the
 * username already exists.
 *
 * Steps:
 *
 * 1. Register first moderator with a unique username - should succeed
 * 2. Attempt to register second moderator with same username - should fail
 * 3. Verify error response indicates duplicate username constraint violation
 */
export async function test_api_moderator_registration_unique_username_validation(
  connection: api.IConnection,
) {
  // Generate a unique username for testing
  const testUsername = `moderator_${RandomGenerator.alphaNumeric(8)}`;
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName1 = RandomGenerator.name();
  const displayName2 = RandomGenerator.name();

  // Step 1: Register first moderator with unique username - should succeed
  const firstModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: firstEmail,
        username: testUsername,
        password: password,
        display_name: displayName1,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(firstModerator);

  // Validate first moderator was created successfully
  TestValidator.equals(
    "first moderator display_name matches input",
    firstModerator.moderator.display_name,
    displayName1,
  );
  TestValidator.predicate(
    "first moderator account is active",
    firstModerator.moderator.account_status === "active",
  );
  TestValidator.predicate(
    "first moderator received authorization token",
    firstModerator.token.access.length > 0,
  );

  // Step 2: Attempt to register second moderator with same username - should fail
  await TestValidator.error(
    "duplicate username should fail with validation error",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email: secondEmail,
          username: testUsername,
          password: password,
          display_name: displayName2,
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    },
  );
}
