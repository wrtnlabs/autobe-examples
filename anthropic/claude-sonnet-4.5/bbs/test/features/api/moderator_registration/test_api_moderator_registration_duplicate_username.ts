import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration rejection when attempting to register with a
 * duplicate username.
 *
 * This test validates the unique constraint enforcement on the username field
 * in the discussion_board_moderators table. It ensures that the system properly
 * rejects duplicate username registrations, which is critical for maintaining
 * unique moderator identifiers for audit trails and moderation action
 * attribution.
 *
 * Test Flow:
 *
 * 1. Successfully register first moderator with unique credentials
 * 2. Validate successful registration response
 * 3. Attempt to register second moderator with same username but different email
 * 4. Verify that duplicate username registration is rejected with appropriate
 *    error
 */
export async function test_api_moderator_registration_duplicate_username(
  connection: api.IConnection,
) {
  // Step 1: Generate unique test data for the first moderator
  const sharedUsername = RandomGenerator.name(1);
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const firstPassword = RandomGenerator.alphaNumeric(12);

  const firstModeratorData = {
    email: firstEmail,
    password: firstPassword,
    username: sharedUsername,
    display_name: RandomGenerator.name(2),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  // Step 2: Successfully register the first moderator
  const firstModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: firstModeratorData,
    });

  // Step 3: Validate the successful registration response
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

  // Step 4: Generate different credentials for second registration attempt
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const secondPassword = RandomGenerator.alphaNumeric(12);

  const secondModeratorData = {
    email: secondEmail,
    password: secondPassword,
    username: sharedUsername, // SAME username as first moderator
    display_name: RandomGenerator.name(2),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  // Step 5: Attempt to register second moderator with duplicate username
  // This should fail due to unique constraint on username field
  await TestValidator.error(
    "duplicate username registration should fail",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: secondModeratorData,
      });
    },
  );
}
