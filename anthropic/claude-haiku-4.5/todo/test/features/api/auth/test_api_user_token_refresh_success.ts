import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful user token refresh operation.
 *
 * This test validates the complete token refresh workflow:
 *
 * 1. Create a new user account and receive initial tokens
 * 2. Use the refresh token to obtain new tokens
 * 3. Verify that new tokens are valid and different from the originals
 * 4. Confirm the new access token expiration time is updated
 * 5. Validate that the new access token can be used for authenticated requests
 */
export async function test_api_user_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account to get initial tokens
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123"; // Minimum 8 characters as per DTOs

  const joinResponse: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(joinResponse);

  // Validate that join response contains proper token structure
  TestValidator.predicate(
    "join response has valid access token",
    joinResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "join response has valid refresh token",
    joinResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "join response has access token expiration",
    joinResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "join response has refresh token expiration",
    joinResponse.token.refreshable_until.length > 0,
  );

  // Store the original tokens for comparison
  const originalAccessToken = joinResponse.token.access;
  const originalRefreshToken = joinResponse.token.refresh;
  const originalExpirationTime = joinResponse.token.expired_at;

  // Step 2: Use the refresh token to obtain new tokens
  const refreshResponse: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies ITodoAppUser.IRefresh,
    });
  typia.assert(refreshResponse);

  // Step 3: Verify that new tokens are valid and different from originals
  TestValidator.notEquals(
    "new access token should be different from original",
    refreshResponse.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token should be different from original",
    refreshResponse.token.refresh,
    originalRefreshToken,
  );

  // Step 4: Confirm the new access token expiration time is updated
  TestValidator.predicate(
    "new expiration time should be different from original",
    refreshResponse.token.expired_at !== originalExpirationTime,
  );

  // Validate token structure in refresh response
  TestValidator.predicate(
    "refresh response has valid new access token",
    refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh response has valid new refresh token",
    refreshResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "refresh response has new access token expiration",
    refreshResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh response has new refresh token expiration",
    refreshResponse.token.refreshable_until.length > 0,
  );

  // Step 5: Validate user information is preserved
  TestValidator.equals(
    "user ID should be the same after refresh",
    refreshResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "user email should be the same after refresh",
    refreshResponse.email,
    joinResponse.email,
  );
}
