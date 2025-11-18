import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful JWT token refresh workflow for authenticated user sessions.
 *
 * This test validates the core token refresh mechanism that enables long-lived
 * user sessions without requiring re-authentication. The workflow creates a new
 * user account to obtain initial JWT tokens, then uses the refresh token to
 * generate new tokens, validating proper token rotation and response
 * structure.
 *
 * Steps:
 *
 * 1. Create a new user account through join endpoint to obtain initial tokens
 * 2. Extract the refresh token from the join response
 * 3. Call the refresh endpoint with the refresh token
 * 4. Validate the new token response structure and fields
 * 5. Verify token rotation (new tokens differ from original tokens)
 */
export async function test_api_user_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account to obtain initial JWT tokens
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const initialUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(initialUser);

  // Store original tokens for comparison
  const initialAccessToken = initialUser.token.access;
  const initialRefreshToken = initialUser.token.refresh;

  // Step 2: Use the refresh token to obtain new JWT tokens
  const refreshRequestBody = {
    refresh_token: initialRefreshToken,
  } satisfies ITodoListUser.IRefresh;

  const refreshedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: refreshRequestBody,
    });
  typia.assert(refreshedUser);

  // Step 3: Verify token rotation - new tokens should differ from original tokens
  TestValidator.notEquals(
    "new access token should differ from original access token",
    refreshedUser.token.access,
    initialAccessToken,
  );

  TestValidator.notEquals(
    "new refresh token should differ from original refresh token",
    refreshedUser.token.refresh,
    initialRefreshToken,
  );

  // Step 4: Verify user ID and email remain consistent after token refresh
  TestValidator.equals(
    "user ID should remain the same after refresh",
    refreshedUser.id,
    initialUser.id,
  );

  TestValidator.equals(
    "user email should remain the same after refresh",
    refreshedUser.email,
    initialUser.email,
  );
}
