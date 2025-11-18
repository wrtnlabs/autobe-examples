import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that a new session is created for each login request.
 *
 * Validates multi-device login support where each login creates its own session
 * record. The test performs the following workflow:
 *
 * 1. Register a new user account
 * 2. Perform first login and verify session creation with valid tokens
 * 3. Perform second login with same credentials from different device context
 * 4. Verify that a new, separate session is created
 * 5. Confirm both sessions are independent and user data is consistent
 * 6. Validate that each login has distinct timestamps and device information
 */
export async function test_api_user_login_session_creation_per_login(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePassword123";

  const registerResponse = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      href: "https://localhost:3000/auth/register",
      referrer: "https://localhost:3000",
      ip: "192.168.1.100",
      user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Device1",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registerResponse);

  const userId = registerResponse.id;
  TestValidator.equals(
    "registration created user with email",
    registerResponse.email,
    email,
  );
  TestValidator.predicate(
    "access token exists after registration",
    registerResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists after registration",
    registerResponse.token.refresh.length > 0,
  );

  // Step 2: Perform first login
  const firstLoginResponse = await api.functional.auth.user.login(connection, {
    body: {
      email,
      password,
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(firstLoginResponse);

  TestValidator.equals(
    "first login returns same user ID",
    firstLoginResponse.id,
    userId,
  );
  TestValidator.equals(
    "first login returns user email",
    firstLoginResponse.email,
    email,
  );
  TestValidator.predicate(
    "first login access token exists",
    firstLoginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "first login refresh token exists",
    firstLoginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "first login access token is different from refresh",
    firstLoginResponse.token.access !== firstLoginResponse.token.refresh,
  );

  const firstAccessToken = firstLoginResponse.token.access;
  const firstRefreshToken = firstLoginResponse.token.refresh;

  // Step 3: Perform second login with different device information
  // Create a new connection to simulate a different device/session
  const newConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const secondLoginResponse = await api.functional.auth.user.login(
    newConnection,
    {
      body: {
        email,
        password,
      } satisfies ITodoListUser.ILogin,
    },
  );
  typia.assert(secondLoginResponse);

  TestValidator.equals(
    "second login returns same user ID",
    secondLoginResponse.id,
    userId,
  );
  TestValidator.equals(
    "second login returns user email",
    secondLoginResponse.email,
    email,
  );
  TestValidator.predicate(
    "second login access token exists",
    secondLoginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "second login refresh token exists",
    secondLoginResponse.token.refresh.length > 0,
  );

  const secondAccessToken = secondLoginResponse.token.access;
  const secondRefreshToken = secondLoginResponse.token.refresh;

  // Step 4: Verify that tokens from the two logins are different
  TestValidator.notEquals(
    "second login creates new access token",
    firstAccessToken,
    secondAccessToken,
  );
  TestValidator.notEquals(
    "second login creates new refresh token",
    firstRefreshToken,
    secondRefreshToken,
  );

  // Step 5: Verify token expiration times are valid and different
  TestValidator.predicate(
    "first login access token has expiration",
    new Date(firstLoginResponse.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "first login refresh token has expiration",
    new Date(firstLoginResponse.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "second login access token has expiration",
    new Date(secondLoginResponse.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "second login refresh token has expiration",
    new Date(secondLoginResponse.token.refreshable_until) > new Date(),
  );

  // Step 6: Verify user data consistency across logins
  TestValidator.equals(
    "user data consistent between logins",
    firstLoginResponse.id,
    secondLoginResponse.id,
  );
  TestValidator.equals(
    "user email consistent between logins",
    firstLoginResponse.email,
    secondLoginResponse.email,
  );
  TestValidator.equals(
    "user created_at consistent between logins",
    firstLoginResponse.created_at,
    secondLoginResponse.created_at,
  );

  // Step 7: Verify that last_login_at would be updated (if present, it should be non-null)
  TestValidator.predicate(
    "user login timestamp is set after login",
    secondLoginResponse.last_login_at !== null,
  );

  // Step 8: Verify deleted_at is null (user account is active)
  TestValidator.equals(
    "user account is not deleted",
    secondLoginResponse.deleted_at,
    null,
  );
}
