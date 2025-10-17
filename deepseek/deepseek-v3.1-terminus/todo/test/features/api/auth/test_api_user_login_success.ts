import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMinimalTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoUser";

/**
 * Test successful user authentication with valid credentials.
 *
 * This E2E test validates the complete login workflow from user registration
 * through successful authentication. It ensures that valid email and password
 * combinations are properly verified against stored account data, and that
 * proper JWT tokens are generated for session establishment.
 *
 * The test follows this workflow:
 *
 * 1. Create a test user account with valid credentials
 * 2. Authenticate using the same credentials to verify login functionality
 * 3. Validate the authentication response contains proper user identity and tokens
 * 4. Ensure token structure and expiration follow JWT standards
 */
export async function test_api_user_login_success(connection: api.IConnection) {
  // Step 1: Create a test user account for login testing
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(10); // 10-character password

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: testEmail,
      password: testPassword,
    } satisfies IMinimalTodoUser.ICreate,
  });
  typia.assert(createdUser);

  // Step 2: Authenticate the user with same credentials
  const authenticatedUser = await api.functional.auth.user.login(connection, {
    body: {
      email: testEmail,
      password: testPassword,
    } satisfies IMinimalTodoUser.ILogin,
  });
  typia.assert(authenticatedUser);

  // Step 3: Validate authentication response structure
  TestValidator.equals(
    "user ID should match created user",
    authenticatedUser.id,
    createdUser.id,
  );
  TestValidator.equals(
    "token should be generated",
    authenticatedUser.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token should be generated",
    authenticatedUser.token.refresh.length > 0,
    true,
  );

  // Step 4: Validate token expiration timestamps are in the future
  const currentTime = new Date();
  const tokenExpiry = new Date(authenticatedUser.token.expired_at);
  const refreshExpiry = new Date(authenticatedUser.token.refreshable_until);

  TestValidator.predicate(
    "access token should have future expiration",
    tokenExpiry > currentTime,
  );
  TestValidator.predicate(
    "refresh token should have future expiration",
    refreshExpiry > currentTime,
  );
  TestValidator.predicate(
    "refresh token should expire after access token",
    refreshExpiry > tokenExpiry,
  );
}
