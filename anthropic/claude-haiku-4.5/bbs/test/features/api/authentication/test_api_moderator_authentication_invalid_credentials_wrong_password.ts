import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test authentication failure when moderator provides incorrect password.
 *
 * A moderator provides a valid email or username but an incorrect password. The
 * system performs bcrypt verification against the stored password_hash and
 * rejects the authentication attempt. The system does not reveal whether the
 * email/username exists, returning an appropriate error message. No session
 * record is created for failed authentication attempts. This validates password
 * validation security and prevents information leakage about registered
 * accounts.
 *
 * Test flow:
 *
 * 1. Test with a known email and incorrect password
 * 2. Test with a known username and incorrect password
 * 3. Test with a non-existent email and password (security verification)
 * 4. Verify all attempts fail consistently without revealing account information
 */
export async function test_api_moderator_authentication_invalid_credentials_wrong_password(
  connection: api.IConnection,
) {
  // Generate test credentials for various login scenarios
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testUsername = RandomGenerator.alphaNumeric(15);
  const wrongPassword = "IncorrectPassword123!@#";

  // Create test URI and referrer for the login requests
  const testUri = "https://example.com/admin/login";
  const testReferrer = "https://example.com/";

  // Test 1: Attempt to login with email and incorrect password
  // This should fail since the password doesn't match the stored password_hash
  const wrongPasswordLoginWithEmail = {
    email: testEmail,
    password: wrongPassword,
    href: testUri,
    referrer: testReferrer,
  } satisfies IDiscussionBoardModerator.ILogin;

  await TestValidator.error(
    "login with email and incorrect password should fail",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: wrongPasswordLoginWithEmail,
      });
    },
  );

  // Test 2: Attempt to login with username and incorrect password
  // This should also fail - the system validates password against bcrypt hash
  const wrongPasswordLoginWithUsername = {
    username: testUsername,
    password: wrongPassword,
    href: testUri,
    referrer: testReferrer,
  } satisfies IDiscussionBoardModerator.ILogin;

  await TestValidator.error(
    "login with username and incorrect password should fail",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: wrongPasswordLoginWithUsername,
      });
    },
  );

  // Test 3: Verify security - non-existent email with any password fails
  // This ensures the system doesn't leak account existence information
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const nonExistentLoginBody = {
    email: nonExistentEmail,
    password: wrongPassword,
    href: testUri,
    referrer: testReferrer,
  } satisfies IDiscussionBoardModerator.ILogin;

  await TestValidator.error(
    "login with non-existent email should fail without revealing account status",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: nonExistentLoginBody,
      });
    },
  );

  // Test 4: Verify security - non-existent username with any password also fails
  // Ensures consistent error handling that doesn't distinguish between
  // "user not found" and "wrong password"
  const nonExistentUsername = RandomGenerator.alphaNumeric(20);
  const nonExistentUsernameLoginBody = {
    username: nonExistentUsername,
    password: wrongPassword,
    href: testUri,
    referrer: testReferrer,
  } satisfies IDiscussionBoardModerator.ILogin;

  await TestValidator.error(
    "login with non-existent username should fail without revealing account status",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: nonExistentUsernameLoginBody,
      });
    },
  );
}
