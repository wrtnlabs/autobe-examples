import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test email case-insensitivity in moderator registration.
 *
 * Validates that email addresses are treated case-insensitively for uniqueness
 * enforcement. Registers a moderator with email 'Admin@Example.com', then
 * attempts to register another with 'admin@example.com'. The second
 * registration should be rejected as duplicate email due to case-insensitive
 * matching.
 *
 * 1. Register moderator with uppercase/mixed-case email (Admin@Example.com)
 * 2. Verify successful registration and status
 * 3. Attempt to register another with lowercase email variant (admin@example.com)
 * 4. Verify the second registration fails due to case-insensitive duplicate
 *    detection
 */
export async function test_api_moderator_registration_email_case_insensitivity(
  connection: api.IConnection,
) {
  // 1. Register first moderator with mixed-case email
  const firstEmail = "Admin@Example.com";
  const firstModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: firstEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "SecurePass123!",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(firstModerator);

  // 2. Verify first registration was successful
  TestValidator.equals(
    "first moderator account status is active",
    firstModerator.account_status,
    "active",
  );
  TestValidator.equals(
    "first moderator moderation tier is full",
    firstModerator.moderation_tier,
    "full",
  );

  // 3. Attempt to register second moderator with lowercase email variant
  const secondEmail = "admin@example.com"; // Same email, different case
  await TestValidator.error(
    "duplicate email registration should fail with case-insensitive matching",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email: secondEmail,
          username: RandomGenerator.alphaNumeric(8),
          password: "AnotherPass456!",
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    },
  );
}
