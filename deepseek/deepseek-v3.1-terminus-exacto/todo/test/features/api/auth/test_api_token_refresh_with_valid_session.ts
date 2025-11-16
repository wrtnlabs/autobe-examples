import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test token refresh functionality for an active user session.
 *
 * Validates that providing a valid refresh token generates new access and
 * refresh tokens with updated expiration timestamps. Verifies that session
 * continuity is maintained and that the new tokens can be used for subsequent
 * API calls.
 */
export async function test_api_token_refresh_with_valid_session(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123!";

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      password_hash: "", // Server will handle the actual hashing
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser);

  // Step 2: Authenticate user to obtain initial tokens
  const baseUrl = "https://example.com";
  const loginResponse = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: `${baseUrl}/login`,
      referrer: `${baseUrl}/`,
    } satisfies ITodoAppUser.ICredentials,
  });
  typia.assert(loginResponse);

  // Store the original tokens for comparison
  const originalAccessToken = loginResponse.token.access;
  const originalRefreshToken = loginResponse.token.refresh;
  const originalExpiredAt = loginResponse.token.expired_at;
  const originalRefreshableUntil = loginResponse.token.refreshable_until;

  // Step 3: Refresh the tokens using the refresh token
  const refreshResponse = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: originalRefreshToken,
      href: `${baseUrl}/refresh`,
      referrer: `${baseUrl}/dashboard`,
    } satisfies ITodoAppUser.IRefreshToken,
  });
  typia.assert(refreshResponse);

  // Step 4: Validate the refreshed tokens
  TestValidator.notEquals(
    "access token should be different after refresh",
    refreshResponse.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token should be different after refresh",
    refreshResponse.token.refresh,
    originalRefreshToken,
  );
  TestValidator.notEquals(
    "expiration timestamp should be updated",
    refreshResponse.token.expired_at,
    originalExpiredAt,
  );
  TestValidator.notEquals(
    "refreshable until timestamp should be updated",
    refreshResponse.token.refreshable_until,
    originalRefreshableUntil,
  );

  // Verify session continuity by checking user information remains consistent
  TestValidator.equals(
    "user ID should remain the same",
    refreshResponse.id,
    createdUser.id,
  );
  TestValidator.equals(
    "user email should remain the same",
    refreshResponse.email,
    createdUser.email,
  );
  TestValidator.equals(
    "user status should remain the same",
    refreshResponse.status,
    createdUser.status,
  );

  // Verify that the new access token can be used for authenticated operations
  TestValidator.predicate(
    "new access token should be valid",
    refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token should be valid",
    refreshResponse.token.refresh.length > 0,
  );
}
