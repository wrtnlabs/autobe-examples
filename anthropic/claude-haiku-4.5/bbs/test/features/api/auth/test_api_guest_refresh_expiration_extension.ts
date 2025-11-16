import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that token refresh properly extends the session lifetime for guest
 * users.
 *
 * This test validates the guest token refresh mechanism by:
 *
 * 1. Creating an initial guest session with temporary access credentials
 * 2. Immediately refreshing the tokens while the access token is still valid
 * 3. Verifying that the new refresh token's refreshable_until timestamp extends
 *    the maximum session duration beyond the original refreshable_until value
 * 4. Confirming that guests can maintain continuous sessions through periodic
 *    token refreshes without requiring re-registration
 *
 * The test ensures that guest users can keep their sessions alive by refreshing
 * tokens before they expire, enabling uninterrupted browsing of published
 * content.
 */
export async function test_api_guest_refresh_expiration_extension(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session
  const initialSession: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(initialSession);

  const initialToken: IAuthorizationToken = initialSession.token;
  typia.assert(initialToken);

  // Verify initial token structure
  TestValidator.predicate(
    "initial access token is a non-empty string",
    initialToken.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token is a non-empty string",
    initialToken.refresh.length > 0,
  );
  TestValidator.predicate(
    "initial expired_at is a valid date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(initialToken.expired_at),
  );
  TestValidator.predicate(
    "initial refreshable_until is a valid date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(initialToken.refreshable_until),
  );

  const initialRefreshableUntil = new Date(initialToken.refreshable_until);

  // Step 2: Refresh the tokens while access token is still valid
  const refreshedSession: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.guest.refresh(connection);
  typia.assert(refreshedSession);

  const refreshedToken: IAuthorizationToken = refreshedSession.token;
  typia.assert(refreshedToken);

  // Step 3: Verify refreshed token structure
  TestValidator.predicate(
    "refreshed access token is a non-empty string",
    refreshedToken.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token is a non-empty string",
    refreshedToken.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshed expired_at is a valid date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(refreshedToken.expired_at),
  );
  TestValidator.predicate(
    "refreshed refreshable_until is a valid date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refreshedToken.refreshable_until,
    ),
  );

  // Step 4: Verify session lifetime extension
  const refreshedRefreshableUntil = new Date(refreshedToken.refreshable_until);

  TestValidator.predicate(
    "refreshable_until extends beyond original expiration",
    refreshedRefreshableUntil.getTime() > initialRefreshableUntil.getTime(),
  );

  // Step 5: Verify tokens are different
  TestValidator.notEquals(
    "access tokens are renewed",
    initialToken.access,
    refreshedToken.access,
  );
  TestValidator.notEquals(
    "refresh tokens are renewed",
    initialToken.refresh,
    refreshedToken.refresh,
  );

  // Step 6: Verify new access token expiration is also updated
  const initialExpiredAt = new Date(initialToken.expired_at);
  const refreshedExpiredAt = new Date(refreshedToken.expired_at);

  TestValidator.predicate(
    "access token expiration is extended",
    refreshedExpiredAt.getTime() > initialExpiredAt.getTime(),
  );
}
