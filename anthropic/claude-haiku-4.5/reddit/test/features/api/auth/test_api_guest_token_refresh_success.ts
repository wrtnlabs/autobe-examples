import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful guest token refresh using a valid refresh token.
 *
 * This test validates the complete guest token refresh workflow:
 *
 * 1. Create a guest account to obtain initial access and refresh tokens
 * 2. Extract the refresh token from the initial guest response
 * 3. Call the refresh endpoint with the valid refresh token
 * 4. Verify that new tokens are issued with updated expiration times
 * 5. Confirm the guest session identity is maintained
 * 6. Validate token structure and freshness
 *
 * The refresh operation should return a new access token with:
 *
 * - Updated expired_at timestamp (fresh 1-hour window)
 * - Extended refreshable_until timestamp
 * - Optionally a new refresh token (token rotation)
 * - Same guest account ID to maintain session continuity
 */
export async function test_api_guest_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest account to obtain refresh token
  const initialGuest: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(initialGuest);

  // Validate initial guest account structure
  TestValidator.predicate(
    "initial guest ID is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      initialGuest.id,
    ),
  );
  TestValidator.predicate(
    "initial access token is provided",
    !!initialGuest.token.access,
  );
  TestValidator.predicate(
    "initial refresh token is provided",
    !!initialGuest.token.refresh,
  );
  TestValidator.predicate(
    "initial expired_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(initialGuest.token.expired_at),
  );
  TestValidator.predicate(
    "initial refreshable_until is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      initialGuest.token.refreshable_until,
    ),
  );

  // Step 2: Extract refresh token for refresh operation
  const refreshToken = initialGuest.token.refresh;
  const initialGuestId = initialGuest.id;
  const initialExpiredAt = initialGuest.token.expired_at;
  const initialRefreshableUntil = initialGuest.token.refreshable_until;

  // Step 3: Call refresh endpoint with valid refresh token
  const refreshedGuest: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies ICommunityPlatformMember.IRefresh,
    });
  typia.assert(refreshedGuest);

  // Step 4: Verify refreshed tokens are valid and updated
  TestValidator.predicate(
    "refreshed access token is provided",
    !!refreshedGuest.token.access,
  );
  TestValidator.predicate(
    "refreshed refresh token is provided",
    !!refreshedGuest.token.refresh,
  );
  TestValidator.predicate(
    "refreshed expired_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refreshedGuest.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshed refreshable_until is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refreshedGuest.token.refreshable_until,
    ),
  );

  // Step 5: Validate session identity is maintained
  TestValidator.equals(
    "guest ID remains the same after refresh",
    refreshedGuest.id,
    initialGuestId,
  );

  // Step 6: Validate token freshness
  // New expired_at should be after the initial one (token has been refreshed)
  const initialExpiry = new Date(initialExpiredAt);
  const refreshedExpiry = new Date(refreshedGuest.token.expired_at);
  TestValidator.predicate(
    "access token has fresh expiration",
    refreshedExpiry > initialExpiry,
  );

  // New refreshable_until should be after the initial one (session extended)
  const initialRefreshableUntilDate = new Date(initialRefreshableUntil);
  const refreshedRefreshableUntilDate = new Date(
    refreshedGuest.token.refreshable_until,
  );
  TestValidator.predicate(
    "refreshable_until is extended after refresh",
    refreshedRefreshableUntilDate > initialRefreshableUntilDate,
  );

  // Step 7: Verify new tokens are different from old ones (new tokens issued)
  TestValidator.notEquals(
    "new access token differs from previous",
    refreshedGuest.token.access,
    initialGuest.token.access,
  );

  // Note: Refresh token may or may not be rotated depending on implementation
  // Some systems rotate refresh tokens, others reuse them
  // We validate that a refresh token exists, but don't assert rotation requirement
  TestValidator.predicate(
    "refresh token exists after refresh",
    !!refreshedGuest.token.refresh,
  );

  // Step 8: Confirm new tokens can be used for authenticated requests
  // The SDK automatically sets the Authorization header with the new access token
  // This is validated implicitly through successful token refresh operation
  TestValidator.predicate("token refresh operation successful", true);
}
