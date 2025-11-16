import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test guest session continuity across token refresh operations.
 *
 * Validates that a guest session remains functional and consistent after
 * refreshing tokens multiple times. Guest users can refresh their temporary
 * access tokens to maintain continuous read-only access to published content
 * without requiring re-registration. This test ensures token refresh operations
 * preserve session identity, maintain proper access controls, and allow
 * sequential refreshes without session degradation.
 *
 * **Test Workflow:**
 *
 * 1. Create initial guest session and capture session ID and tokens
 * 2. Validate initial authorization tokens are properly structured
 * 3. Perform first token refresh and verify new tokens are generated
 * 4. Perform second sequential refresh to test repeated refresh capability
 * 5. Verify session ID remains consistent across all refresh operations
 * 6. Confirm token expiration times are valid throughout refresh cycles
 * 7. Validate that session state persists without degradation
 */
export async function test_api_guest_session_continuity_after_refresh(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session
  const initialSession: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(initialSession);

  // Store initial session values for comparison
  const initialGuestId = initialSession.id;
  const initialAccessToken = initialSession.token.access;
  const initialRefreshToken = initialSession.token.refresh;

  // Validate initial token expiration times are in future
  const initialAccessExpired = new Date(
    initialSession.token.expired_at,
  ).getTime();
  const now = Date.now();
  TestValidator.predicate(
    "initial access token has valid future expiration",
    initialAccessExpired > now,
  );

  const initialRefreshExpired = new Date(
    initialSession.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "initial refresh token has valid future expiration",
    initialRefreshExpired > now,
  );

  // Step 2: Perform first token refresh
  // Note: SDK automatically updates connection.headers.Authorization with new access token
  const firstRefresh: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.guest.refresh(connection);
  typia.assert(firstRefresh);

  // Step 3: Verify guest ID remains the same after first refresh
  TestValidator.equals(
    "guest session ID remains consistent after first refresh",
    firstRefresh.id,
    initialGuestId,
  );

  // Verify tokens have been updated (not identical to original)
  TestValidator.notEquals(
    "access token is updated after first refresh",
    firstRefresh.token.access,
    initialAccessToken,
  );

  TestValidator.notEquals(
    "refresh token is updated after first refresh",
    firstRefresh.token.refresh,
    initialRefreshToken,
  );

  // Validate first refresh token expiration times
  const firstAccessExpired = new Date(firstRefresh.token.expired_at).getTime();
  TestValidator.predicate(
    "first refreshed access token has valid future expiration",
    firstAccessExpired > now,
  );

  const firstRefreshExpired = new Date(
    firstRefresh.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "first refreshed refresh token has valid future expiration",
    firstRefreshExpired > now,
  );

  // Step 4: Perform second sequential refresh
  const secondRefresh: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.guest.refresh(connection);
  typia.assert(secondRefresh);

  // Step 5: Verify guest ID remains constant through second refresh
  TestValidator.equals(
    "guest session ID remains consistent after second refresh",
    secondRefresh.id,
    initialGuestId,
  );

  // Verify tokens have been updated again
  TestValidator.notEquals(
    "access token is updated after second refresh",
    secondRefresh.token.access,
    firstRefresh.token.access,
  );

  TestValidator.notEquals(
    "refresh token is updated after second refresh",
    secondRefresh.token.refresh,
    firstRefresh.token.refresh,
  );

  // Step 6: Validate second refresh token expiration times
  const secondAccessExpired = new Date(
    secondRefresh.token.expired_at,
  ).getTime();
  TestValidator.predicate(
    "second refreshed access token has valid future expiration",
    secondAccessExpired > now,
  );

  const secondRefreshExpired = new Date(
    secondRefresh.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "second refreshed refresh token has valid future expiration",
    secondRefreshExpired > now,
  );

  // Step 7: Final validation - session state preserved through refresh cycles
  TestValidator.predicate(
    "session maintains consistent state after multiple sequential refreshes",
    initialGuestId === firstRefresh.id && firstRefresh.id === secondRefresh.id,
  );
}
