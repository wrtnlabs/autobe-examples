import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful token refresh workflow.
 *
 * This E2E test validates the complete token refresh mechanism for user
 * authentication. It creates a new user account, authenticates the user to
 * establish an active session, then uses the refresh token to obtain new access
 * tokens. The test ensures that token refresh extends user sessions without
 * requiring re-authentication and maintains user context integrity throughout
 * the process.
 */
export async function test_api_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account through registration
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePassword123!";

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(registeredUser);

  // Validate registration response contains proper user information
  TestValidator.equals(
    "registered user email matches",
    registeredUser.email,
    userEmail,
  );
  TestValidator.predicate(
    "registered user has valid token",
    registeredUser.token.access.length > 0 &&
      registeredUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "registered user has future expiration dates",
    new Date(registeredUser.token.expired_at) > new Date() &&
      new Date(registeredUser.token.refreshable_until) > new Date(),
  );

  // Step 2: Authenticate the user to establish active session
  const loginResponse = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://todoapp.example.com/dashboard",
      referrer: "https://todoapp.example.com/login",
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(loginResponse);

  // Validate login response matches registered user
  TestValidator.equals(
    "login user ID matches registered user",
    loginResponse.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "login user email matches",
    loginResponse.email,
    userEmail,
  );
  TestValidator.predicate(
    "login provides valid tokens",
    loginResponse.token.access.length > 0 &&
      loginResponse.token.refresh.length > 0,
  );

  // Step 3: Use refresh token to obtain new access tokens
  const refreshResponse = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: loginResponse.token.refresh,
    } satisfies ITodoAppUser.IRefresh,
  });
  typia.assert(refreshResponse);

  // Validate refresh response maintains user context
  TestValidator.equals(
    "refreshed user ID remains consistent",
    refreshResponse.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "refreshed user email remains consistent",
    refreshResponse.email,
    userEmail,
  );
  TestValidator.predicate(
    "refresh provides new valid tokens",
    refreshResponse.token.access.length > 0 &&
      refreshResponse.token.refresh.length > 0,
  );

  // Validate token expiration timelines are properly updated
  TestValidator.predicate(
    "refreshed tokens have future expiration dates",
    new Date(refreshResponse.token.expired_at) > new Date() &&
      new Date(refreshResponse.token.refreshable_until) > new Date(),
  );

  // Validate that refresh token is different from original (new token issued)
  TestValidator.notEquals(
    "refresh token should be different after refresh",
    refreshResponse.token.refresh,
    loginResponse.token.refresh,
  );
}
