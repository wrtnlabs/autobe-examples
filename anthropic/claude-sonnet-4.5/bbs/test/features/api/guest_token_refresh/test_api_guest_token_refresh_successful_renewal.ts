import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test successful token refresh for an active guest session.
 *
 * This test validates the complete token refresh workflow for guest users,
 * ensuring that expired access tokens can be renewed using valid refresh tokens
 * while maintaining session continuity and updating engagement timestamps.
 *
 * Test Flow:
 *
 * 1. Create initial guest session to obtain tokens
 * 2. Use refresh token to request new credentials
 * 3. Verify new tokens are issued with updated expiration times
 * 4. Confirm session identity remains unchanged
 * 5. Validate page_views counter is not incremented
 * 6. Ensure last_visit_at timestamp reflects current engagement
 */
export async function test_api_guest_token_refresh_successful_renewal(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session
  const sessionIdentifier = typia.random<string & tags.Format<"uuid">>();
  const userAgent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });

  const initialGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        session_identifier: sessionIdentifier,
        ip_address: "192.168.1.100",
        user_agent: userAgent,
      } satisfies IDiscussionBoardGuest.ICreate,
    });
  typia.assert(initialGuest);

  // Store initial values for comparison
  const initialAccessToken = initialGuest.token.access;
  const initialRefreshToken = initialGuest.token.refresh;
  const initialExpiredAt = initialGuest.token.expired_at;
  const initialRefreshableUntil = initialGuest.token.refreshable_until;
  const initialPageViews = initialGuest.page_views;
  const guestId = initialGuest.id;

  // Step 2: Refresh the tokens using refresh token
  const refreshedGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  typia.assert(refreshedGuest);

  // Step 3: Validate new tokens are different from original
  TestValidator.notEquals(
    "access token should be renewed",
    refreshedGuest.token.access,
    initialAccessToken,
  );

  TestValidator.notEquals(
    "refresh token should be renewed",
    refreshedGuest.token.refresh,
    initialRefreshToken,
  );

  // Step 4: Validate expiration timestamps are updated
  TestValidator.predicate(
    "expired_at should be updated to future time",
    new Date(refreshedGuest.token.expired_at).getTime() >
      new Date(initialExpiredAt).getTime(),
  );

  TestValidator.predicate(
    "refreshable_until should be updated to future time",
    new Date(refreshedGuest.token.refreshable_until).getTime() >
      new Date(initialRefreshableUntil).getTime(),
  );

  // Step 5: Validate session identity remains unchanged
  TestValidator.equals(
    "guest id should remain unchanged",
    refreshedGuest.id,
    guestId,
  );

  TestValidator.equals(
    "session identifier should remain unchanged",
    refreshedGuest.session_identifier,
    sessionIdentifier,
  );

  // Step 6: Validate page_views is NOT incremented during refresh
  TestValidator.equals(
    "page views should not be incremented on token refresh",
    refreshedGuest.page_views,
    initialPageViews,
  );

  // Step 7: Validate last_visit_at is updated
  TestValidator.predicate(
    "last_visit_at should be updated to current time",
    new Date(refreshedGuest.last_visit_at).getTime() >=
      new Date(initialGuest.last_visit_at).getTime(),
  );

  // Step 8: Validate other session details remain consistent
  TestValidator.equals(
    "ip_address should remain unchanged",
    refreshedGuest.ip_address,
    initialGuest.ip_address,
  );

  TestValidator.equals(
    "user_agent should remain unchanged",
    refreshedGuest.user_agent,
    userAgent,
  );

  TestValidator.equals(
    "first_visit_at should remain unchanged",
    refreshedGuest.first_visit_at,
    initialGuest.first_visit_at,
  );
}
