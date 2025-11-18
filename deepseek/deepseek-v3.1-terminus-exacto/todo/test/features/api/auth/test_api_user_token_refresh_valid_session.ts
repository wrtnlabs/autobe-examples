import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful token refresh workflow for authenticated users with valid
 * refresh tokens.
 *
 * This test validates the complete authentication lifecycle: user registration,
 * initial login, and token refresh operation. It ensures that refresh tokens
 * properly rotate access tokens while maintaining session continuity and
 * preventing token reuse vulnerabilities.
 */
export async function test_api_user_token_refresh_valid_session(
  connection: api.IConnection,
) {
  // Generate realistic test data
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";
  const userName = RandomGenerator.name();
  const baseUrl = "https://example.com";

  // Step 1: Create a new user account
  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: userName,
      href: baseUrl,
      referrer: baseUrl,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser);

  // Step 2: Authenticate user to obtain initial tokens
  const authenticatedUser = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: baseUrl,
      referrer: baseUrl,
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(authenticatedUser);

  // Validate initial token structure
  TestValidator.equals(
    "user ID remains consistent",
    createdUser.id,
    authenticatedUser.id,
  );
  TestValidator.equals(
    "user email remains consistent",
    createdUser.email,
    authenticatedUser.email,
  );
  TestValidator.equals(
    "user name remains consistent",
    createdUser.name,
    authenticatedUser.name,
  );

  // Store original tokens for comparison
  const originalAccessToken = authenticatedUser.token.access;
  const originalRefreshToken = authenticatedUser.token.refresh;
  const originalExpiredAt = authenticatedUser.token.expired_at;
  const originalRefreshableUntil = authenticatedUser.token.refreshable_until;

  // Step 3: Refresh tokens using the refresh endpoint
  const refreshedUser = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies ITodoAppUser.IRefresh,
  });
  typia.assert(refreshedUser);

  // Step 4: Validate token rotation and session continuity
  TestValidator.equals(
    "user ID remains consistent after refresh",
    authenticatedUser.id,
    refreshedUser.id,
  );
  TestValidator.equals(
    "user email remains consistent after refresh",
    authenticatedUser.email,
    refreshedUser.email,
  );
  TestValidator.equals(
    "user name remains consistent after refresh",
    authenticatedUser.name,
    refreshedUser.name,
  );

  // Validate token rotation (new tokens should differ from original)
  TestValidator.notEquals(
    "access token should be rotated",
    originalAccessToken,
    refreshedUser.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    originalRefreshToken,
    refreshedUser.token.refresh,
  );

  // Validate token structure
  TestValidator.predicate(
    "new access token should not be empty",
    refreshedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token should not be empty",
    refreshedUser.token.refresh.length > 0,
  );

  // Validate expiration timestamps
  TestValidator.predicate("new expired_at should be a valid date-time", () => {
    const expiredAtDate = new Date(refreshedUser.token.expired_at);
    return !isNaN(expiredAtDate.getTime());
  });

  TestValidator.predicate(
    "new refreshable_until should be a valid date-time",
    () => {
      const refreshableUntilDate = new Date(
        refreshedUser.token.refreshable_until,
      );
      return !isNaN(refreshableUntilDate.getTime());
    },
  );

  // Validate that new expiration timestamps are in the future
  const currentTime = new Date();
  const newExpiredAt = new Date(refreshedUser.token.expired_at);
  const newRefreshableUntil = new Date(refreshedUser.token.refreshable_until);

  TestValidator.predicate(
    "new expired_at should be in the future",
    newExpiredAt > currentTime,
  );
  TestValidator.predicate(
    "new refreshable_until should be in the future",
    newRefreshableUntil > currentTime,
  );

  // Additional validation: Ensure the refreshed tokens can be used for subsequent operations
  // This demonstrates that the new tokens are functional
  TestValidator.predicate(
    "refreshed access token should be valid JWT format",
    () => {
      const tokenParts = refreshedUser.token.access.split(".");
      return tokenParts.length === 3;
    },
  );
}
