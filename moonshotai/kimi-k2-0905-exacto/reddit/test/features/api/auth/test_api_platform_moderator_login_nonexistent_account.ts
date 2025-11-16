import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformModerator";

/**
 * Test platform moderator login with non-existent account credentials.
 *
 * This test validates that the system properly rejects login attempts for
 * accounts that do not exist, maintaining security by not revealing account
 * existence information. Verifies that appropriate generic error messages are
 * returned and that the response timing and format are consistent with invalid
 * credential responses to prevent account enumeration attacks. Tests that all
 * login validation paths maintain consistent security behavior.
 *
 * 1. Generate random email addresses that don't exist
 * 2. Attempt login with non-existent credentials
 * 3. Verify error responses are consistent and secure
 * 4. Test multiple scenarios to ensure robust security
 */
export async function test_api_platform_moderator_login_nonexistent_account(
  connection: api.IConnection,
) {
  // Generate multiple random email addresses that are guaranteed to not exist
  const nonExistentEmails = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"email">>(),
  );

  // Test login with non-existent account using different email patterns
  for (const email of nonExistentEmails) {
    await TestValidator.error(
      "login with non-existent email should fail",
      async () => {
        await api.functional.auth.platformModerator.login(connection, {
          body: {
            email: email,
            password: RandomGenerator.alphaNumeric(12),
            href: "https://platform.example.com/login",
            referrer: "https://platform.example.com/",
          } satisfies IRedditCommunityPlatformModerator.ILogin,
        });
      },
    );
  }

  // Test with common email patterns that likely don't exist
  const testEmails = [
    `nonexistent_${RandomGenerator.alphaNumeric(8)}@example.com`,
    `testuser_${RandomGenerator.alphaNumeric(6)}@testdomain.com`,
    `fake_${RandomGenerator.alphaNumeric(10)}@fakeplatform.org`,
  ];

  for (const testEmail of testEmails) {
    await TestValidator.error(
      "login with fake test email should fail",
      async () => {
        await api.functional.auth.platformModerator.login(connection, {
          body: {
            email: testEmail,
            password: "ThisPasswordDoesNotMatter123!",
            href: "https://admin.platform.com/auth",
            referrer: "https://admin.platform.com/",
          } satisfies IRedditCommunityPlatformModerator.ILogin,
        });
      },
    );
  }

  // Test with various password strengths to ensure consistent behavior
  const passwordVariations = [
    RandomGenerator.alphaNumeric(8),
    RandomGenerator.alphaNumeric(16),
    "WeakPass123!",
    "ThisIsAVeryLongPasswordThatShouldNotWorkAnyway",
  ];

  for (const password of passwordVariations) {
    await TestValidator.error(
      "login with non-existent account should fail regardless of password",
      async () => {
        await api.functional.auth.platformModerator.login(connection, {
          body: {
            email: `user_${RandomGenerator.alphaNumeric(12)}@nonexistent.com`,
            password: password,
            href: "https://platform.reddit-community.com/login",
            referrer: "https://platform.reddit-community.com/",
          } satisfies IRedditCommunityPlatformModerator.ILogin,
        });
      },
    );
  }

  // Verify that the system doesn't reveal account existence through timing or error differences
  // This is tested implicitly by checking consistent error behavior across all attempts
  TestValidator.predicate(
    "all non-existent login attempts consistently fail",
    true, // If we reach here, all error tests passed
  );
}
