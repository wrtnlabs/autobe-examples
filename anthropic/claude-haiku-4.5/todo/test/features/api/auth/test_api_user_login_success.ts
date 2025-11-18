import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful user login with valid credentials.
 *
 * This test validates the complete authentication flow for user login:
 *
 * 1. Register a new user with known email and password
 * 2. Authenticate using the same credentials
 * 3. Verify user information is returned correctly
 * 4. Validate JWT tokens are properly formatted
 * 5. Confirm last_login_at timestamp is updated
 * 6. Ensure user account remains active after login
 */
export async function test_api_user_login_success(connection: api.IConnection) {
  // Step 1: Register a user with known credentials
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = "SecurePassword123"; // 8+ characters as required

  const registrationResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: testEmail,
        password: testPassword,
        href: "http://localhost:3000/register" satisfies string &
          tags.Format<"uri">,
        referrer: "http://localhost:3000" satisfies string & tags.Format<"uri">,
        ip: "127.0.0.1",
        user_agent: "Mozilla/5.0 Test Browser",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registrationResponse);

  // Verify registration response includes user data and tokens
  TestValidator.predicate(
    "registration should return user id",
    registrationResponse.id !== undefined,
  );
  TestValidator.equals(
    "registered email matches input",
    registrationResponse.email,
    testEmail,
  );
  TestValidator.predicate(
    "registration should return access token",
    registrationResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "registration should return refresh token",
    registrationResponse.token.refresh.length > 0,
  );

  // Step 2: Create a fresh connection without the registration token to test login
  const freshConnection: api.IConnection = { ...connection, headers: {} };

  // Step 3: Authenticate with the same credentials
  const loginResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(freshConnection, {
      body: {
        email: testEmail,
        password: testPassword,
      } satisfies ITodoListUser.ILogin,
    });
  typia.assert(loginResponse);

  // Step 4: Validate user information
  TestValidator.equals(
    "login response includes user id",
    loginResponse.id,
    registrationResponse.id,
  );
  TestValidator.equals(
    "login response has same email",
    loginResponse.email,
    testEmail,
  );
  TestValidator.predicate(
    "user should not be deleted",
    loginResponse.deleted_at === null,
  );
  TestValidator.predicate(
    "last login timestamp should be set after login",
    loginResponse.last_login_at !== null,
  );

  // Step 5: Validate JWT tokens
  TestValidator.predicate(
    "access token should be present",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration should be set",
    loginResponse.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refresh token expiration should be set",
    loginResponse.token.refreshable_until !== undefined,
  );

  // Step 6: Verify token expiration timestamps are in ISO 8601 format
  const accessExpiry = new Date(loginResponse.token.expired_at);
  const refreshExpiry = new Date(loginResponse.token.refreshable_until);
  TestValidator.predicate(
    "access token expiry should be valid date",
    !isNaN(accessExpiry.getTime()),
  );
  TestValidator.predicate(
    "refresh token expiry should be valid date",
    !isNaN(refreshExpiry.getTime()),
  );

  // Step 7: Verify access token is usable by checking it's set in connection headers
  TestValidator.predicate(
    "access token should be in connection headers after login",
    freshConnection.headers?.Authorization === loginResponse.token.access,
  );

  // Step 8: Verify timestamps in user response
  const createdAt = new Date(loginResponse.created_at);
  const updatedAt = new Date(loginResponse.updated_at);
  const lastLoginAt = new Date(loginResponse.last_login_at!);

  TestValidator.predicate(
    "created_at should be valid timestamp",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at should be valid timestamp",
    !isNaN(updatedAt.getTime()),
  );
  TestValidator.predicate(
    "last_login_at should be valid timestamp",
    !isNaN(lastLoginAt.getTime()),
  );

  // Step 9: Verify last_login_at was updated on successful login (should be recent)
  const now = new Date();
  TestValidator.predicate(
    "last_login_at should be recent",
    Math.abs(now.getTime() - lastLoginAt.getTime()) < 5000,
  ); // Within 5 seconds

  // Step 10: Test case-insensitive email login with uppercase local part
  const testEmailLocal = testEmail.split("@")[0];
  const testEmailDomain = testEmail.split("@")[1];
  const uppercaseEmail = testEmailLocal.toUpperCase() + "@" + testEmailDomain;

  const caseInsensitiveLoginResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(freshConnection, {
      body: {
        email: uppercaseEmail,
        password: testPassword,
      } satisfies ITodoListUser.ILogin,
    });
  typia.assert(caseInsensitiveLoginResponse);

  TestValidator.equals(
    "case-insensitive login should return same user id",
    caseInsensitiveLoginResponse.id,
    loginResponse.id,
  );
  TestValidator.equals(
    "case-insensitive login should return lowercase email",
    caseInsensitiveLoginResponse.email,
    testEmail,
  );
}
