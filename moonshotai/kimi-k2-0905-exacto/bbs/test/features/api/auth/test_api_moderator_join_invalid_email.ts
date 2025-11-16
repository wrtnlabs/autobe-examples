import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test moderator registration failure when providing an invalid email format.
 *
 * This test validates that the moderator registration endpoint properly
 * validates email format requirements. When an invalid email is provided, the
 * system should reject the registration attempt with appropriate error
 * handling, ensuring that moderator accounts are created only with valid
 * contact information for administrative communications and account
 * verification.
 *
 * The test follows these steps:
 *
 * 1. Generate moderator registration data with an invalid email format
 * 2. Attempt to register with the invalid email
 * 3. Verify that the registration fails as expected
 * 4. Confirm proper error handling for format validation
 */
export async function test_api_moderator_join_invalid_email(
  connection: api.IConnection,
) {
  // Create moderator registration data with invalid email format
  const requestBody = {
    username: RandomGenerator.paragraph({ sentences: 2 }),
    email: "not-an-email-without-at-symbol.com", // Invalid email format
    password_hash: RandomGenerator.alphaNumeric(32),
    moderation_level: "basic",
  } satisfies IEconomicDiscussionModerator.ICreate;

  // Verify that registration with invalid email fails
  await TestValidator.error(
    "registration should fail with invalid email format",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: requestBody,
      });
    },
  );
}
