import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test session management through login authentication and token
 * initialization.
 *
 * This test validates the session lifecycle management by:
 *
 * 1. Creating a user account successfully
 * 2. Logging in with valid credentials to trigger session creation
 * 3. Verifying that authentication tokens (access and refresh) are properly
 *    initialized with appropriate expiration times
 * 4. Confirming user data is correctly returned after login
 *
 * Note: The server creates session records with timeout fields (created_at,
 * last_activity_at, expired_at, absolute_timeout_at) server-side. The client
 * receives token expiration information (expired_at for access token,
 * refreshable_until for refresh token) which reflects the session timeout
 * configuration. This test validates the token structure and timing to ensure
 * proper session initialization.
 */
export async function test_api_user_login_session_timeout_initialization(
  connection: api.IConnection,
) {
  // Step 1: Create a test user account via join endpoint
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(8) + "Pass1!";

  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Login with the created user credentials to verify session initialization
  const loginBeforeTime = new Date();

  const loginResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoListUser.ILogin,
    });
  typia.assert(loginResponse);

  const loginAfterTime = new Date();

  // Step 3: Verify token structure is present and properly initialized
  TestValidator.predicate(
    "token structure should exist after login",
    loginResponse.token !== null && loginResponse.token !== undefined,
  );

  // Step 4: Verify access token is present and non-empty
  TestValidator.predicate(
    "access token should be issued and non-empty",
    loginResponse.token.access.length > 0,
  );

  // Step 5: Verify refresh token is present and non-empty
  TestValidator.predicate(
    "refresh token should be issued and non-empty",
    loginResponse.token.refresh.length > 0,
  );

  // Step 6: Verify access token expiration time (represents session active period)
  const accessExpiredTime = new Date(loginResponse.token.expired_at);
  TestValidator.predicate(
    "access token expiration should be set to future time",
    accessExpiredTime.getTime() > loginAfterTime.getTime(),
  );

  // Step 7: Verify refresh token expiration time (represents maximum session duration)
  const refreshExpiredTime = new Date(loginResponse.token.refreshable_until);
  TestValidator.predicate(
    "refresh token expiration should extend beyond access token",
    refreshExpiredTime.getTime() >= accessExpiredTime.getTime(),
  );

  // Step 8: Verify typical session timeout duration (~30 days for refresh token as per spec)
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const refreshDurationMs =
    refreshExpiredTime.getTime() - loginAfterTime.getTime();
  TestValidator.predicate(
    "refresh token expiration should be approximately 30 days from login",
    refreshDurationMs > 25 * 24 * 60 * 60 * 1000 &&
      refreshDurationMs < 35 * 24 * 60 * 60 * 1000,
  );

  // Step 9: Verify user data is returned indicating active session
  TestValidator.predicate(
    "user id should be returned in authenticated response",
    loginResponse.id !== undefined && loginResponse.id !== null,
  );

  // Step 10: Verify user email matches login credentials
  TestValidator.equals(
    "returned user email should match login credentials",
    loginResponse.email,
    userEmail,
  );

  // Step 11: Verify user account is active (not deleted)
  TestValidator.equals(
    "user deleted_at should be null indicating active session permission",
    loginResponse.deleted_at,
    null,
  );

  // Step 12: Verify user timestamps are properly set
  const userCreatedTime = new Date(loginResponse.created_at);
  TestValidator.predicate(
    "user creation time should be recent",
    userCreatedTime.getTime() >= loginBeforeTime.getTime() - 5000 &&
      userCreatedTime.getTime() <= loginAfterTime.getTime() + 5000,
  );

  // Step 13: Verify user was updated recently (indicating active session)
  TestValidator.predicate(
    "user updated_at should reflect recent session activity",
    loginResponse.updated_at !== null && loginResponse.updated_at !== undefined,
  );

  // Step 14: Verify last login timestamp reflects session initialization
  if (
    loginResponse.last_login_at !== null &&
    loginResponse.last_login_at !== undefined
  ) {
    const lastLoginTime = new Date(loginResponse.last_login_at);
    TestValidator.predicate(
      "last_login_at should be set to current login time",
      lastLoginTime.getTime() >= loginBeforeTime.getTime() - 5000 &&
        lastLoginTime.getTime() <= loginAfterTime.getTime() + 5000,
    );
  }
}
