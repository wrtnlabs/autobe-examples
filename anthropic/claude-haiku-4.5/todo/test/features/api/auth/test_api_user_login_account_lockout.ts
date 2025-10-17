import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuth";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";

/**
 * Tests account lockout mechanism after multiple failed login attempts.
 *
 * This test validates that the authentication system properly protects user
 * accounts from brute force attacks by locking the account after 5 failed login
 * attempts within a 15-minute window. The test verifies:
 *
 * 1. Create a user account with valid credentials
 * 2. Make 5 failed login attempts with incorrect passwords
 * 3. Confirm account lockout (HTTP 429) after 5th attempt
 * 4. Verify subsequent login attempts are denied during lockout
 *
 * Steps:
 *
 * 1. Generate valid test credentials
 * 2. Register a new user account
 * 3. Attempt 5 failed logins with wrong passwords (expecting 401 errors)
 * 4. Verify 6th login attempt triggers account lockout (HTTP 429)
 * 5. Verify account remains locked on subsequent attempts
 */
export async function test_api_user_login_account_lockout(
  connection: api.IConnection,
) {
  // Step 1: Generate test credentials
  const testEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = "SecurePass123!@#";
  const wrongPassword = "WrongPassword123!";

  // Step 2: Register a new user account
  const registrationResponse = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        email: testEmail,
        password: validPassword,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    },
  );
  typia.assert(registrationResponse);

  // Create a fresh connection without authentication for login attempts
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3: Attempt 5 failed login attempts with incorrect passwords
  // Each attempt should return 401 Unauthorized
  for (let attempt = 1; attempt <= 5; attempt++) {
    await TestValidator.httpError(
      `failed login attempt ${attempt} should return 401`,
      401,
      async () => {
        await api.functional.auth.authenticatedUser.login(unauthConnection, {
          body: {
            email: testEmail,
            password: wrongPassword,
          } satisfies ITodoAppAuthenticatedUser.ILogin,
        });
      },
    );
  }

  // Step 4: Verify account lockout (HTTP 429) after 5 failed attempts
  // The 6th attempt should trigger lockout
  await TestValidator.httpError(
    "account should be locked after 5 failed attempts with 429 error",
    429,
    async () => {
      await api.functional.auth.authenticatedUser.login(unauthConnection, {
        body: {
          email: testEmail,
          password: wrongPassword,
        } satisfies ITodoAppAuthenticatedUser.ILogin,
      });
    },
  );

  // Step 5: Verify account remains locked on subsequent attempts
  // Even with correct password, account should return 429 during lockout
  await TestValidator.httpError(
    "locked account should return 429 even with correct password",
    429,
    async () => {
      await api.functional.auth.authenticatedUser.login(unauthConnection, {
        body: {
          email: testEmail,
          password: validPassword,
        } satisfies ITodoAppAuthenticatedUser.ILogin,
      });
    },
  );
}
