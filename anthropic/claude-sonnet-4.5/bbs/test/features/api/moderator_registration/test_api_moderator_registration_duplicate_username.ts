import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration behavior when attempting to register with a
 * duplicate username.
 *
 * This test validates that the discussion board moderator registration system
 * properly enforces username uniqueness constraints. It creates a moderator
 * account with a specific username, then attempts to create a second moderator
 * account using the same username but different email and password.
 *
 * The test ensures that:
 *
 * 1. First moderator registration succeeds with valid credentials
 * 2. Second registration attempt with duplicate username fails
 * 3. System properly rejects duplicate username registration
 * 4. First moderator account remains valid and unaffected
 *
 * Test Steps:
 *
 * 1. Generate unique test username and two different email addresses
 * 2. Create first moderator account with username, email1, and password1
 * 3. Verify first registration succeeds and returns valid moderator data
 * 4. Attempt to create second moderator with same username but email2 and
 *    password2
 * 5. Validate that second registration fails with appropriate error
 */
export async function test_api_moderator_registration_duplicate_username(
  connection: api.IConnection,
) {
  // Generate test data
  const sharedUsername = RandomGenerator.name(1);
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const firstPassword = RandomGenerator.alphaNumeric(12);
  const secondPassword = RandomGenerator.alphaNumeric(12);
  const testHref = typia.random<string & tags.Format<"uri">>();
  const testReferrer = typia.random<string & tags.Format<"uri">>();

  // Step 1: Create first moderator account successfully
  const firstModeratorData = {
    email: firstEmail,
    password: firstPassword,
    username: sharedUsername,
    href: testHref,
    referrer: testReferrer,
  } satisfies IDiscussionBoardModerator.ICreate;

  const firstModerator = await api.functional.auth.moderator.join(connection, {
    body: firstModeratorData,
  });

  // Validate first moderator creation
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

  // Step 2: Attempt to create second moderator with duplicate username
  await TestValidator.error(
    "duplicate username registration should fail",
    async () => {
      const secondModeratorData = {
        email: secondEmail,
        password: secondPassword,
        username: sharedUsername,
        href: testHref,
        referrer: testReferrer,
      } satisfies IDiscussionBoardModerator.ICreate;

      await api.functional.auth.moderator.join(connection, {
        body: secondModeratorData,
      });
    },
  );
}
