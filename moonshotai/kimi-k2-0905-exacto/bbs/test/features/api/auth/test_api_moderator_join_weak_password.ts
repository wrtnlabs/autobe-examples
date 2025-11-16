import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test moderator registration failure when providing a password that doesn't
 * meet security requirements.
 *
 * This test validates that the API properly rejects weak passwords and enforces
 * password strength requirements for moderator accounts. Since the actual
 * password validation logic is handled by the backend implementation (not
 * visible in the provided materials), this test demonstrates the proper
 * structure for testing moderator registration with invalid credentials while
 * maintaining type safety.
 *
 * The test shows that moderator accounts - with their elevated administrative
 * permissions - are subject to enhanced security validation beyond the basic
 * type requirements.
 */
export async function test_api_moderator_join_weak_password(
  connection: api.IConnection,
) {
  // Create a moderator registration request with valid types but potential validation issues
  const weakPasswordModerator = {
    username: "test_moderator",
    email: "moderator@test.com",
    password_hash: "password123", // Common weak password pattern
    moderation_level: "moderator",
  } satisfies IEconomicDiscussionModerator.ICreate;

  // Attempt registration and validate proper error handling
  await TestValidator.error(
    "weak password should be rejected for moderator registration",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: weakPasswordModerator,
      });
    },
  );
}
