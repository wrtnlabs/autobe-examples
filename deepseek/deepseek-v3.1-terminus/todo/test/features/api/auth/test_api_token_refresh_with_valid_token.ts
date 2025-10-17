import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMinimalTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoUser";

/**
 * Test that a valid refresh token can be used to generate new access tokens.
 *
 * This test validates the token refresh functionality by creating a user
 * account to obtain initial authentication tokens, then using the refresh token
 * to generate new access tokens. The test ensures that the refresh process
 * maintains user session continuity without requiring re-authentication and
 * validates that both access and refresh tokens are properly regenerated with
 * updated expiration timestamps.
 */
export async function test_api_token_refresh_with_valid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account to obtain initial authentication tokens
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12); // Generate random password

  const initialAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IMinimalTodoUser.ICreate,
  });
  await typia.assert(initialAuth); // Added await for proper async handling

  // Step 2: Extract the refresh token from the initial authentication response
  const refreshToken = initialAuth.token.refresh;

  // Validate that the refresh token is present and not empty
  TestValidator.predicate(
    "refresh token should be present",
    refreshToken.length > 0,
  );

  // Step 3: Use the refresh token to call the refresh endpoint
  const refreshedAuth = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh: refreshToken,
    } satisfies IMinimalTodoUser.IRefresh,
  });
  await typia.assert(refreshedAuth); // Added await for proper async handling

  // Step 4: Validate that new tokens are generated with proper structure
  TestValidator.predicate(
    "new access token should be present",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token should be present",
    refreshedAuth.token.refresh.length > 0,
  );

  // Step 5: Verify user session continuity by comparing user IDs
  TestValidator.equals(
    "user ID should remain consistent after refresh",
    refreshedAuth.id,
    initialAuth.id,
  );

  // Step 6: Ensure both access and refresh tokens are updated
  TestValidator.notEquals(
    "access token should be different after refresh",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be different after refresh",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );

  // Step 7: Validate expiration timestamps are properly set
  TestValidator.predicate(
    "access token expiration should be in ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      refreshedAuth.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refresh token expiration should be in ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      refreshedAuth.token.refreshable_until,
    ),
  );

  // Additional validation: Ensure expiration timestamps are in the future
  const currentTime = new Date();
  const accessExpiration = new Date(refreshedAuth.token.expired_at);
  const refreshExpiration = new Date(refreshedAuth.token.refreshable_until);

  TestValidator.predicate(
    "access token expiration should be in the future",
    accessExpiration > currentTime,
  );
  TestValidator.predicate(
    "refresh token expiration should be in the future",
    refreshExpiration > currentTime,
  );

  // Utilize ArrayUtil for additional validation (if needed)
  const tokenArray = [refreshedAuth.token.access, refreshedAuth.token.refresh];
  TestValidator.predicate(
    "both tokens should be valid strings",
    ArrayUtil.has(
      tokenArray,
      (token) => typeof token === "string" && token.length > 0,
    ),
  );
}
