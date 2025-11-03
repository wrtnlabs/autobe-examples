import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validates token refresh functionality and demonstrates token lifecycle.
 *
 * Tests that the system properly handles token refresh operations for user
 * accounts. While the original scenario requested testing inactive user denial,
 * this is not implementable with the current API since no user status
 * modification endpoints are available. Instead, this test validates that token
 * refresh works correctly and maintains proper token validity.
 *
 * The test flow:
 *
 * 1. Register a new user account and obtain initial tokens
 * 2. Verify the user is active and tokens are valid
 * 3. Use refresh token to obtain new access tokens
 * 4. Confirm new tokens are properly formed and valid
 * 5. Verify token renewal extends authentication session
 *
 * Note: Testing inactive user account rejection would require a user status
 * management API endpoint (e.g., PUT /auth/user/status) to mark users as
 * inactive. This endpoint is not available in the current API.
 */
export async function test_api_user_token_refresh_inactive_user_account(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(12);

  const joinResponse: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppUser.IJoin,
    });

  typia.assert(joinResponse);

  // Step 2: Verify user is active after registration
  TestValidator.equals(
    "user status is active after registration",
    joinResponse.status,
    "active",
  );

  // Extract tokens from initial registration
  const initialAccessToken = joinResponse.token.access;
  const refreshToken = joinResponse.token.refresh;
  const tokenExpiration = joinResponse.token.expired_at;
  const refreshExpiration = joinResponse.token.refreshable_until;

  TestValidator.predicate(
    "access token exists after registration",
    initialAccessToken !== null &&
      initialAccessToken !== undefined &&
      initialAccessToken.length > 0,
  );

  TestValidator.predicate(
    "refresh token exists after registration",
    refreshToken !== null &&
      refreshToken !== undefined &&
      refreshToken.length > 0,
  );

  TestValidator.predicate(
    "token expiration timestamp is valid",
    tokenExpiration !== null &&
      tokenExpiration !== undefined &&
      tokenExpiration.length > 0,
  );

  // Step 3: Use refresh token to obtain new access tokens
  const refreshResponse: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies ITodoAppUser.IRefresh,
    });

  typia.assert(refreshResponse);

  // Step 4: Verify new tokens are properly formed
  TestValidator.equals(
    "refreshed user status is active",
    refreshResponse.status,
    "active",
  );

  const newAccessToken = refreshResponse.token.access;
  const newRefreshToken = refreshResponse.token.refresh;

  TestValidator.predicate(
    "new access token exists after refresh",
    newAccessToken !== null &&
      newAccessToken !== undefined &&
      newAccessToken.length > 0,
  );

  TestValidator.predicate(
    "new refresh token exists after refresh",
    newRefreshToken !== null &&
      newRefreshToken !== undefined &&
      newRefreshToken.length > 0,
  );

  // Step 5: Verify tokens are different (refresh generates new tokens)
  TestValidator.notEquals(
    "new access token differs from original",
    newAccessToken,
    initialAccessToken,
  );

  // Verify token renewal extends authentication session
  TestValidator.predicate(
    "token refresh successfully extends session",
    refreshResponse.token.expired_at !== null &&
      refreshResponse.token.expired_at !== undefined,
  );
}
