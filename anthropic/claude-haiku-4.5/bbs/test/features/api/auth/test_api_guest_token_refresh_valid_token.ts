import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test token refresh with a valid, non-expired refresh token.
 *
 * This test validates the guest token refresh functionality by:
 *
 * 1. Registering a guest user to obtain initial access and refresh tokens
 * 2. Extracting the refresh token from the registration response
 * 3. Calling the refresh endpoint with the valid refresh token
 * 4. Verifying the response contains new tokens
 * 5. Confirming the new access token differs from the original
 * 6. Confirming the new refresh token differs from the original
 * 7. Validating token expiration timestamps are properly set
 */
export async function test_api_guest_token_refresh_valid_token(
  connection: api.IConnection,
) {
  // Step 1: Register a guest user to obtain valid tokens
  const registered: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {} satisfies IDiscussionBoardGuest.ICreate,
    });
  typia.assert(registered);

  // Store original tokens for comparison
  const originalAccessToken = registered.token.access;
  const originalRefreshToken = registered.token.refresh;
  const originalAccessExpired = registered.token.expired_at;

  // Step 2: Call refresh endpoint with the valid refresh token
  const refreshed: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  typia.assert(refreshed);

  // Step 3: Verify new access token is different from original
  TestValidator.notEquals(
    "new access token differs from original",
    refreshed.token.access,
    originalAccessToken,
  );

  // Step 4: Verify new refresh token is different from original
  TestValidator.notEquals(
    "new refresh token differs from original",
    refreshed.token.refresh,
    originalRefreshToken,
  );

  // Step 5: Verify access token expiration timestamp is fresh
  TestValidator.notEquals(
    "new access token expiration timestamp differs",
    refreshed.token.expired_at,
    originalAccessExpired,
  );

  // Step 6: Verify new tokens are non-empty strings
  TestValidator.predicate(
    "new access token is non-empty",
    refreshed.token.access.length > 0,
  );

  TestValidator.predicate(
    "new refresh token is non-empty",
    refreshed.token.refresh.length > 0,
  );

  // Step 7: Verify refreshable_until timestamp exists and is valid
  TestValidator.predicate(
    "refreshable_until timestamp is valid ISO string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refreshed.token.refreshable_until,
    ),
  );

  // Step 8: Verify new tokens have valid future expiration
  const newRefreshableUntil = new Date(
    refreshed.token.refreshable_until,
  ).getTime();
  const now = new Date().getTime();
  TestValidator.predicate(
    "new refresh token has future expiration",
    newRefreshableUntil > now,
  );
}
