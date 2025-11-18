import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful token refresh operation using a valid refresh token.
 *
 * This scenario validates that authenticated users can extend their session by
 * refreshing tokens without requiring full re-authentication. The test creates
 * a new user account, obtains initial authentication tokens, waits briefly to
 * ensure token expiration timing is meaningful, then uses the refresh token to
 * obtain new access tokens. Validates that new tokens are issued with updated
 * expiration times and that the refresh token rotation mechanism works
 * correctly to maintain session security.
 */
export async function test_api_user_token_refresh_with_valid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account to establish authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const initialAuth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(initialAuth);

  // Store the initial refresh token for later use
  const originalRefreshToken = initialAuth.token.refresh;
  const originalAccessToken = initialAuth.token.access;

  // Step 2: Wait briefly to simulate token expiration timing
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 3: Use the refresh token to obtain new authentication tokens
  const refreshedAuth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies ITodoListUser.IRefresh,
    });
  typia.assert(refreshedAuth);

  // Step 4: Validate that new tokens are issued with updated expiration
  TestValidator.notEquals(
    "new access token should be different from original",
    refreshedAuth.token.access,
    originalAccessToken,
  );

  TestValidator.notEquals(
    "new refresh token should be different from original (token rotation)",
    refreshedAuth.token.refresh,
    originalRefreshToken,
  );

  TestValidator.predicate(
    "refreshed token should have valid expiration timestamp",
    new Date(refreshedAuth.token.expired_at) > new Date(),
  );

  TestValidator.predicate(
    "refreshed token should have valid refreshable until timestamp",
    new Date(refreshedAuth.token.refreshable_until) > new Date(),
  );

  TestValidator.equals(
    "user ID should remain the same after token refresh",
    refreshedAuth.id,
    initialAuth.id,
  );

  TestValidator.equals(
    "user email should remain the same after token refresh",
    refreshedAuth.email,
    initialAuth.email,
  );

  TestValidator.equals(
    "user status should remain the same after token refresh",
    refreshedAuth.status,
    initialAuth.status,
  );

  // Additional validation for token format compliance
  TestValidator.predicate(
    "access token should not be empty",
    refreshedAuth.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should not be empty",
    refreshedAuth.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "expiration timestamp should be valid ISO format",
    !isNaN(new Date(refreshedAuth.token.expired_at).getTime()),
  );

  TestValidator.predicate(
    "refreshable until timestamp should be valid ISO format",
    !isNaN(new Date(refreshedAuth.token.refreshable_until).getTime()),
  );
}
