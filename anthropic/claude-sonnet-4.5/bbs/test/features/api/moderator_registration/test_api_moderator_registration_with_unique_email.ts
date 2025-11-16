import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration email uniqueness constraint enforcement.
 *
 * This test validates the critical business rule that each moderator must have
 * a unique email address across the platform. The test performs two
 * registration attempts with the same email address:
 *
 * 1. First registration: Successfully creates a moderator account
 * 2. Second registration: Attempts to create another account with the same email
 * 3. Validation: Confirms the second attempt fails due to duplicate email
 *
 * This ensures the system properly enforces email uniqueness at the database
 * level and returns appropriate error responses for duplicate registration
 * attempts.
 */
export async function test_api_moderator_registration_with_unique_email(
  connection: api.IConnection,
) {
  // Generate unique test email that will be used for both registration attempts
  const testEmail = typia.random<string & tags.Format<"email">>();

  // Step 1: Successfully register the first moderator with the test email
  const firstModeratorData = {
    email: testEmail,
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(1),
    ip: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const firstModerator = await api.functional.auth.moderator.join(connection, {
    body: firstModeratorData,
  });

  typia.assert(firstModerator);

  // Validate the first moderator was created successfully
  TestValidator.equals(
    "first moderator email matches",
    firstModerator.email,
    testEmail,
  );
  TestValidator.equals(
    "first moderator username matches",
    firstModerator.username,
    firstModeratorData.username,
  );

  // Step 2: Attempt to register a second moderator with the same email
  // This should fail due to email uniqueness constraint
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email: testEmail,
          password: RandomGenerator.alphaNumeric(12),
          username: RandomGenerator.name(1),
          ip: typia.random<string>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    },
  );
}
