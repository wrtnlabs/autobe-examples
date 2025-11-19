import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration rejection when attempting to register with
 * duplicate email.
 *
 * This test validates the unique constraint enforcement on the email field in
 * the discussion_board_moderators table. It ensures that each moderator has a
 * unique email address for authentication and communication purposes.
 *
 * Test workflow:
 *
 * 1. Successfully register a moderator with a specific email address
 * 2. Attempt to register another moderator using the same email but different
 *    username and password
 * 3. Verify that the duplicate email registration is rejected with an appropriate
 *    error
 */
export async function test_api_moderator_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Generate unique test data for the first moderator
  const duplicateEmail = typia.random<string & tags.Format<"email">>();
  const firstUsername = RandomGenerator.alphaNumeric(10);
  const firstPassword = RandomGenerator.alphaNumeric(12);

  const firstModeratorData = {
    email: duplicateEmail,
    password: firstPassword,
    username: firstUsername,
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  // Step 2: Register the first moderator successfully
  const firstModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: firstModeratorData,
    });

  // Step 3: Validate the first moderator registration succeeded
  typia.assert(firstModerator);
  TestValidator.equals(
    "first moderator email matches",
    firstModerator.email,
    duplicateEmail,
  );
  TestValidator.equals(
    "first moderator username matches",
    firstModerator.username,
    firstUsername,
  );

  // Step 4: Attempt to register a second moderator with the same email but different credentials
  const secondUsername = RandomGenerator.alphaNumeric(10);
  const secondPassword = RandomGenerator.alphaNumeric(12);

  const secondModeratorData = {
    email: duplicateEmail,
    password: secondPassword,
    username: secondUsername,
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  // Step 5: Verify that duplicate email registration fails
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: secondModeratorData,
      });
    },
  );
}
