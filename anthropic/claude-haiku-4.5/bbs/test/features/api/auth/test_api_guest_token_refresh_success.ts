import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful token refresh for active guest sessions.
 *
 * This test validates the guest token refresh endpoint by:
 *
 * 1. Creating an initial guest session with tokens
 * 2. Extracting the refresh token from the initial session
 * 3. Using the refresh token to obtain new access and refresh tokens
 * 4. Validating that new tokens are returned with valid structure
 * 5. Confirming the new access token's expiration is further in the future
 * 6. Verifying the guest session ID remains consistent
 *
 * The test ensures guest session continuity and proper token rotation
 * mechanics.
 */
export async function test_api_guest_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session
  const initialGuest: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(initialGuest);

  // Verify initial guest session has valid tokens
  TestValidator.predicate(
    "initial guest should have valid ID",
    initialGuest.id !== null && initialGuest.id !== undefined,
  );
  TestValidator.predicate(
    "initial guest should have access token",
    initialGuest.token.access !== null &&
      initialGuest.token.access !== undefined,
  );
  TestValidator.predicate(
    "initial guest should have refresh token",
    initialGuest.token.refresh !== null &&
      initialGuest.token.refresh !== undefined,
  );

  // Store initial token expiration for comparison
  const initialExpiredAt = new Date(initialGuest.token.expired_at).getTime();
  const initialRefreshableUntil = new Date(
    initialGuest.token.refreshable_until,
  ).getTime();

  // Step 2: Refresh the guest tokens using the refresh token
  const refreshedGuest: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.guest.refresh(connection);
  typia.assert(refreshedGuest);

  // Step 3: Validate refreshed guest session
  TestValidator.predicate(
    "refreshed guest should have valid ID",
    refreshedGuest.id !== null && refreshedGuest.id !== undefined,
  );
  TestValidator.predicate(
    "refreshed guest should have new access token",
    refreshedGuest.token.access !== null &&
      refreshedGuest.token.access !== undefined,
  );
  TestValidator.predicate(
    "refreshed guest should have new refresh token",
    refreshedGuest.token.refresh !== null &&
      refreshedGuest.token.refresh !== undefined,
  );

  // Step 4: Verify guest session ID remains the same
  TestValidator.equals(
    "guest session ID should remain unchanged",
    refreshedGuest.id,
    initialGuest.id,
  );

  // Step 5: Verify new tokens have updated expiration timestamps
  const refreshedExpiredAt = new Date(
    refreshedGuest.token.expired_at,
  ).getTime();
  const refreshedRefreshableUntil = new Date(
    refreshedGuest.token.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "new access token expiration should be in the future",
    refreshedExpiredAt > initialExpiredAt,
  );
  TestValidator.predicate(
    "new refresh token expiration should be in the future",
    refreshedRefreshableUntil > initialRefreshableUntil,
  );

  // Step 6: Verify tokens are different (rotation occurred)
  TestValidator.notEquals(
    "access token should be rotated",
    refreshedGuest.token.access,
    initialGuest.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    refreshedGuest.token.refresh,
    initialGuest.token.refresh,
  );

  // Step 7: Verify token format and structure
  TestValidator.predicate(
    "new expired_at should be valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refreshedGuest.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "new refreshable_until should be valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refreshedGuest.token.refreshable_until,
    ),
  );
}
