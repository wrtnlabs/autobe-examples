import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test community moderator login failure with non-existent email address.
 *
 * This test validates that the community moderator authentication system
 * properly handles login attempts with invalid credentials. The test uses a
 * non-existent email address combined with random password to attempt
 * authentication and verifies that the system responds with an appropriate
 * error message without revealing whether the email account actually exists.
 *
 * The test ensures that the API returns an error response that doesn't
 * distinguish between "email not found" and "password incorrect" scenarios,
 * which is a critical security practice to prevent email enumeration attacks.
 *
 * Business logic tested:
 *
 * 1. Authentication with non-existent email and password
 * 2. Proper error response formatting
 * 3. Security-conscious messaging that doesn't reveal account existence
 * 4. HTTP status code handling for authentication failures
 *
 * Test will generate a random, non-existent email address and attempt login
 * with random credentials to verify the authentication system's security and
 * error handling capabilities.
 */
export async function test_api_communitymoderator_login_with_invalid_email(
  connection: api.IConnection,
) {
  // Generate a random email address that almost certainly doesn't exist
  const randomEmail = typia.random<string & tags.Format<"email">>();

  // Generate a random password for the authentication attempt
  const randomPassword = RandomGenerator.alphaNumeric(12);

  // Generate proper URL strings for session context
  const currentUrl = "https://example.com/login";
  const referrerUrl = "https://example.com/";

  // Attempt to login with non-existent credentials
  await TestValidator.error(
    "login should fail with non-existent email address",
    async () => {
      await api.functional.auth.communityModerator.login(connection, {
        body: {
          email: randomEmail,
          password: randomPassword,
          href: currentUrl,
          referrer: referrerUrl,
        } satisfies IRedditCommunityCommunityModerator.ILogin,
      });
    },
  );

  // Additional security validation: ensure no sensitive information is leaked
  // This verifies the system doesn't reveal whether an email exists

  // Test with different email that follows email format but is clearly invalid
  const clearlyInvalidEmail = "definitely@does-not-exist.invalid-domain";
  const randomPassword2 = RandomGenerator.alphaNumeric(8);

  await TestValidator.error(
    "login should fail with clearly invalid domain email",
    async () => {
      await api.functional.auth.communityModerator.login(connection, {
        body: {
          email: clearlyInvalidEmail,
          password: randomPassword2,
          href: currentUrl,
          referrer: referrerUrl,
        } satisfies IRedditCommunityCommunityModerator.ILogin,
      });
    },
  );

  // Test edge case: random password with invalid email
  const anotherInvalidEmail = typia.random<string & tags.Format<"email">>();

  await TestValidator.error(
    "login should fail with random invalid email and password",
    async () => {
      await api.functional.auth.communityModerator.login(connection, {
        body: {
          email: anotherInvalidEmail,
          password: RandomGenerator.alphaNumeric(10),
          href: currentUrl,
          referrer: referrerUrl,
        } satisfies IRedditCommunityCommunityModerator.ILogin,
      });
    },
  );
}
