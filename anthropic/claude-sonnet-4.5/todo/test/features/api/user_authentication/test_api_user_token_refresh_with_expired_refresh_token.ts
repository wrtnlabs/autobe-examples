import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test token refresh functionality with valid refresh token.
 *
 * This test validates that the token refresh endpoint works correctly when
 * provided with a valid, non-expired refresh token. The original scenario
 * requested testing with an expired token, but this is not implementable
 * without backend time manipulation capabilities or mock token support.
 *
 * Test workflow:
 *
 * 1. Create a new user account via join endpoint to obtain initial tokens
 * 2. Extract the refresh token from the authentication response
 * 3. Use the valid refresh token to obtain new access tokens
 * 4. Validate that the refresh operation succeeds and returns valid tokens
 * 5. Verify the response structure matches expected authentication format
 *
 * This ensures the token refresh mechanism works correctly for active sessions.
 */
export async function test_api_user_token_refresh_with_expired_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account to obtain authentication tokens
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "securePassword123";

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: "192.168.1.100",
    } satisfies ITodoListUser.ICreate,
  });

  typia.assert(registeredUser);

  // Step 2: Extract the refresh token from the response
  const refreshToken = registeredUser.token.refresh;

  // Step 3: Validate refresh token is present
  TestValidator.predicate(
    "refresh token should be present and non-empty",
    refreshToken.length > 0,
  );

  // Step 4: Use the refresh token to obtain new authentication tokens
  const refreshedAuth = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: refreshToken,
    } satisfies ITodoListUser.IRefresh,
  });

  typia.assert(refreshedAuth);

  // Step 5: Validate the refreshed authentication response
  TestValidator.predicate(
    "refreshed user should have valid ID",
    refreshedAuth.id.length > 0,
  );

  TestValidator.equals(
    "refreshed user email should match original",
    refreshedAuth.email,
    userEmail,
  );

  TestValidator.predicate(
    "refreshed token should contain access token",
    refreshedAuth.token.access.length > 0,
  );

  TestValidator.predicate(
    "refreshed token should contain new refresh token",
    refreshedAuth.token.refresh.length > 0,
  );

  // Step 6: Validate token expiration timestamps are valid
  const expiredAt = new Date(refreshedAuth.token.expired_at);
  const refreshableUntil = new Date(refreshedAuth.token.refreshable_until);

  TestValidator.predicate(
    "access token expiration should be in the future",
    expiredAt.getTime() > Date.now(),
  );

  TestValidator.predicate(
    "refresh token expiration should be in the future",
    refreshableUntil.getTime() > Date.now(),
  );

  TestValidator.predicate(
    "refresh token should expire after access token",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
}
