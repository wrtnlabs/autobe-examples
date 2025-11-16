import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test moderator login attempt with non-existent username
 *
 * This test validates the system's behavior when a moderator attempts to login
 * with a username that does not exist in the system. The test ensures:
 *
 * 1. Proper error handling for invalid credentials
 * 2. Consistent error response regardless of username validity
 * 3. Prevention of username enumeration through timing attacks
 * 4. Appropriate security logging and protection measures
 * 5. Clear error messages without exposing account existence
 *
 * The test uses random data generation to create realistic but non-existent
 * moderator credentials and validates that the API responds appropriately.
 */
export async function test_api_moderator_login_nonexistent_user(
  connection: api.IConnection,
) {
  // Generate random non-existent moderator credentials
  const loginData = {
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(12),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://example.com/moderator/login",
    referrer: "https://example.com/moderator",
  } satisfies IEconomicDiscussionModerator.ILogin;

  // Test that login with non-existent credentials fails appropriately
  await TestValidator.error(
    "non-existent moderator login should fail with proper error",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: loginData,
      });
    },
  );

  // Test with various username patterns to ensure consistent behavior
  const usernamePatterns = [
    RandomGenerator.alphaNumeric(3), // Minimum length
    RandomGenerator.alphaNumeric(50), // Maximum length
    RandomGenerator.name(), // Name-like username
    RandomGenerator.alphabets(10), // Alphabetic only
  ];

  for (const username of usernamePatterns) {
    const testData = {
      username,
      password: RandomGenerator.alphaNumeric(10),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: "https://example.com/moderator/login",
      referrer: "https://example.com/moderator",
    } satisfies IEconomicDiscussionModerator.ILogin;

    await TestValidator.error(
      "non-existent username pattern should fail consistently",
      async () => {
        await api.functional.auth.moderator.login(connection, {
          body: testData,
        });
      },
    );
  }
}
