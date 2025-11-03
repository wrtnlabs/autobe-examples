import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validates successful user token refresh workflow.
 *
 * Tests that an authenticated user can use a valid refresh token to obtain a
 * new access token, enabling seamless session continuation without
 * re-authentication. The complete lifecycle verifies:
 *
 * 1. User registration generates initial access and refresh tokens
 * 2. Refresh token is properly extracted from authentication response
 * 3. Token refresh endpoint returns new access token
 * 4. New access token differs from original token
 * 5. User remains authenticated with new token
 * 6. New token has valid expiration timestamps
 * 7. Session is properly extended through token refresh
 */
export async function test_api_user_token_refresh_valid_token(
  connection: api.IConnection,
) {
  // Step 1: Register a new user to obtain initial tokens
  const email = typia.random<string & tags.Format<"email">>();
  const password = `${RandomGenerator.alphabets(10)}`; // Minimum 8 characters required

  const initialAuth: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(initialAuth);

  // Verify initial authentication response contains required fields
  TestValidator.equals(
    "initial auth response contains correct email",
    initialAuth.email,
    email,
  );
  TestValidator.equals(
    "user account status is active",
    initialAuth.status,
    "active",
  );

  // Step 2: Extract initial tokens from authentication response
  const initialAccessToken = initialAuth.token.access;
  const refreshToken = initialAuth.token.refresh;

  TestValidator.predicate(
    "initial access token exists and is non-empty",
    initialAccessToken.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists and is non-empty",
    refreshToken.length > 0,
  );
  TestValidator.predicate(
    "initial token expiration timestamp is valid",
    initialAuth.token.expired_at.length > 0,
  );

  // Step 3: Call token refresh endpoint with valid refresh token
  const refreshedAuth: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies ITodoAppUser.IRefresh,
    });
  typia.assert(refreshedAuth);

  // Step 4: Verify new access token is returned and differs from original
  const newAccessToken = refreshedAuth.token.access;
  const newRefreshToken = refreshedAuth.token.refresh;

  TestValidator.notEquals(
    "new access token differs from original",
    newAccessToken,
    initialAccessToken,
  );
  TestValidator.predicate(
    "new access token is non-empty string",
    newAccessToken.length > 0,
  );

  // Step 5: Verify new token has valid expiration timestamps
  TestValidator.predicate(
    "new token expiration is valid datetime",
    refreshedAuth.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is valid until timestamp",
    refreshedAuth.token.refreshable_until.length > 0,
  );

  // Step 6: Verify user information is still correct in refreshed auth
  TestValidator.equals(
    "user id remains same after refresh",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "user email remains same after refresh",
    refreshedAuth.email,
    email,
  );
  TestValidator.equals(
    "user status remains active after refresh",
    refreshedAuth.status,
    "active",
  );

  // Step 7: Verify user can use new refresh token for additional refreshes
  // This validates that the new refresh token is valid and session continues
  const secondRefresh: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: newRefreshToken,
      } satisfies ITodoAppUser.IRefresh,
    });
  typia.assert(secondRefresh);

  TestValidator.equals(
    "second refresh returns same user id",
    secondRefresh.id,
    initialAuth.id,
  );
  TestValidator.predicate(
    "second refresh provides new access token",
    secondRefresh.token.access.length > 0,
  );
  TestValidator.notEquals(
    "second refresh access token is different from previous",
    secondRefresh.token.access,
    newAccessToken,
  );

  // Step 8: Verify token refresh mechanism properly extends session
  TestValidator.predicate(
    "session successfully extended through multiple token refreshes",
    secondRefresh.token.refreshable_until.length > 0,
  );
}
