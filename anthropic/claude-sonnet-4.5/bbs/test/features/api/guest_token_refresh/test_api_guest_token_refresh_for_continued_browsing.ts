import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test guest token refresh workflow for maintaining continuous browsing
 * sessions.
 *
 * This test validates the JWT refresh token mechanism that enables guest users
 * to maintain seamless browsing sessions when their access token expires after
 * 30 minutes. The refresh workflow is critical for user experience, allowing
 * extended content exploration without re-authentication or session
 * interruption.
 *
 * Test Steps:
 *
 * 1. Create initial guest session and obtain JWT tokens (access + refresh)
 * 2. Extract refresh token from the initial authorization response
 * 3. Call refresh endpoint with the refresh token to obtain new access token
 * 4. Validate new token structure and expiration timestamps
 * 5. Verify session continuity by confirming guest ID remains unchanged
 * 6. Confirm all token fields are properly populated and valid
 *
 * Expected Outcomes:
 *
 * - New access token successfully issued with fresh 30-minute expiration
 * - Refresh token accepted and validated (within 7-day lifetime)
 * - Guest session identity preserved across token refresh
 * - Token structure conforms to IAuthorizationToken schema
 */
export async function test_api_guest_token_refresh_for_continued_browsing(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session to obtain tokens
  const initialGuest = await api.functional.auth.guest.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      session_metadata: {
        ip_address: "192.168.1.100",
        user_agent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(initialGuest);

  // Step 2: Validate initial guest session structure
  TestValidator.predicate(
    "initial guest should have valid ID",
    initialGuest.id.length > 0,
  );
  TestValidator.predicate(
    "initial token should have access token",
    initialGuest.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial token should have refresh token",
    initialGuest.token.refresh.length > 0,
  );

  // Step 3: Use refresh token to obtain new access token
  const refreshedGuest = await api.functional.auth.guest.refresh(connection, {
    body: {
      refresh_token: initialGuest.token.refresh,
    } satisfies IDiscussionBoardGuest.IRefresh,
  });
  typia.assert(refreshedGuest);

  // Step 4: Validate refreshed token structure
  TestValidator.predicate(
    "refreshed guest should have valid ID",
    refreshedGuest.id.length > 0,
  );
  TestValidator.predicate(
    "refreshed token should have access token",
    refreshedGuest.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed token should have refresh token",
    refreshedGuest.token.refresh.length > 0,
  );

  // Step 5: Verify session continuity - guest ID must remain the same
  TestValidator.equals(
    "guest ID should be preserved across token refresh",
    refreshedGuest.id,
    initialGuest.id,
  );

  // Step 6: Validate new access token is different from original
  TestValidator.notEquals(
    "new access token should differ from original",
    refreshedGuest.token.access,
    initialGuest.token.access,
  );

  // Step 7: Validate token expiration timestamps are properly set
  TestValidator.predicate(
    "refreshed token should have valid expired_at timestamp",
    refreshedGuest.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshed token should have valid refreshable_until timestamp",
    refreshedGuest.token.refreshable_until.length > 0,
  );

  // Step 8: Verify expired_at is a valid date-time format
  const expiredAtDate = new Date(refreshedGuest.token.expired_at);
  TestValidator.predicate(
    "expired_at should be valid date",
    !isNaN(expiredAtDate.getTime()),
  );

  // Step 9: Verify refreshable_until is a valid date-time format
  const refreshableUntilDate = new Date(refreshedGuest.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until should be valid date",
    !isNaN(refreshableUntilDate.getTime()),
  );

  // Step 10: Verify refreshable_until is after expired_at (refresh token outlives access token)
  TestValidator.predicate(
    "refresh token should expire after access token",
    refreshableUntilDate.getTime() > expiredAtDate.getTime(),
  );
}
