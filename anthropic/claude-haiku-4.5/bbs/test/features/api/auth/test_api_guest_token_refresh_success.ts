import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful guest token refresh workflow.
 *
 * Validates that a guest with a valid refresh token can obtain new JWT tokens
 * (access and refresh) without re-registering through the join endpoint. The
 * test verifies:
 *
 * 1. Guest account creation via join endpoint with initial tokens
 * 2. Token refresh using the initial refresh token
 * 3. New tokens are returned and differ from initial tokens
 * 4. Token expiration windows are properly set (15 min access, 7 day refresh)
 * 5. Access token expires before refresh token
 * 6. Refresh operation maintains guest session continuity
 *
 * This workflow represents the typical guest user session extension scenario
 * where the access token expires during active browsing but the guest continues
 * their session using the refresh token.
 */
export async function test_api_guest_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create a guest account via join endpoint
  const initialAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(initialAuth);

  // Step 2: Refresh the guest token using the initial refresh token
  const refreshRequest = {
    refresh_token: initialAuth.token.refresh,
  } satisfies IDiscussionBoardMember.IRefreshRequest;

  const refreshedAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: refreshRequest,
    });
  typia.assert(refreshedAuth);

  // Step 3: Validate token rotation - new tokens should be different from initial
  TestValidator.notEquals(
    "new access token should differ from initial access token",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );

  TestValidator.notEquals(
    "new refresh token should differ from initial refresh token",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );

  // Step 4: Verify refresh token expiration is in future (7-day window)
  const now = new Date();
  const refreshableUntil = new Date(refreshedAuth.token.refreshable_until);
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

  TestValidator.predicate(
    "refresh token should be valid for approximately 7 days",
    refreshableUntil.getTime() - now.getTime() > 6 * 24 * 60 * 60 * 1000 &&
      refreshableUntil.getTime() - now.getTime() <= sevenDaysInMs + 60000, // +1 min tolerance
  );

  // Step 5: Verify access token expiration is sooner than refresh token
  const expiredAt = new Date(refreshedAuth.token.expired_at);
  TestValidator.predicate(
    "access token should expire before refresh token",
    expiredAt.getTime() < refreshableUntil.getTime(),
  );

  // Step 6: Verify access token expiration is within 15-minute window
  const fifteenMinutesInMs = 15 * 60 * 1000;
  TestValidator.predicate(
    "access token should expire within approximately 15 minutes",
    expiredAt.getTime() - now.getTime() > 14 * 60 * 1000 &&
      expiredAt.getTime() - now.getTime() <= fifteenMinutesInMs + 60000, // +1 min tolerance
  );
}
