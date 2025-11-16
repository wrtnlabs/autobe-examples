import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUserJoin";
import type { IShoppingMallGuestUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUserRefresh";

/**
 * Validate guestUser session refresh with a valid refresh token.
 *
 * Business goal
 *
 * - Ensure that a guest user who has just joined can successfully refresh their
 *   session using the issued refresh token.
 * - Confirm that guest identity remains stable while access token (and possibly
 *   refresh token) lifetimes are updated.
 *
 * Scenario steps
 *
 * 1. Join as a new guest user via POST /auth/guestUser/join.
 * 2. Extract guest id and initial authorization token (access, refresh,
 *    expired_at, refreshable_until).
 * 3. Call POST /auth/guestUser/refresh using the original refresh token and
 *    realistic ip/userAgent telemetry.
 * 4. Verify both responses structurally with typia.assert.
 * 5. Assert that:
 *
 *    - Guest id and temporary_identifier are preserved.
 *    - Access token has been rotated (changed).
 *    - Refresh token is a non-empty string.
 *    - New expired_at is later than the original expired_at.
 *    - New refreshable_until is not earlier than the original refreshable_until.
 *
 * Error-handling and scope
 *
 * - Only the happy path with a valid refresh token is tested here.
 * - No header manipulation or status-code level validation is performed; a
 *   successful refresh is inferred from the function resolving and passing
 *   typia.assert.
 */
export async function test_api_guest_user_refresh_with_valid_token(
  connection: api.IConnection,
) {
  // 1. Join as a new guest user to obtain initial authorized payload
  const joinRequestBody = {
    temporaryIdentifier: RandomGenerator.alphaNumeric(16),
    guestCartToken: null,
    ip: "127.0.0.1",
    userAgent: "E2E-Test-Agent/1.0",
    href: "https://example.com/landing",
    referrer: "https://example.com/referrer",
  } satisfies IShoppingMallGuestUserJoin.IRequest;

  const joined: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(joined);

  const originalToken: IAuthorizationToken = joined.token;

  // 2. Refresh using the original refresh token
  const refreshRequestBody = {
    refreshToken: originalToken.refresh,
    ip: "127.0.0.1",
    userAgent: "E2E-Test-Agent/1.0",
  } satisfies IShoppingMallGuestUserRefresh.IRequest;

  const refreshed: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: refreshRequestBody,
    });
  typia.assert(refreshed);

  const refreshedToken: IAuthorizationToken = refreshed.token;

  // 3. Identity stability: guest id and temporary_identifier should stay same
  TestValidator.equals(
    "guest id should be stable across refresh",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "temporary_identifier should be preserved",
    refreshed.temporary_identifier,
    joined.temporary_identifier,
  );

  // 4. Access token rotation: new access token must differ from the original
  TestValidator.notEquals(
    "access token must be rotated on refresh",
    refreshedToken.access,
    originalToken.access,
  );

  // 5. Refresh token behavior: should be a non-empty string
  TestValidator.predicate(
    "refreshed refresh token should be non-empty string",
    refreshedToken.refresh.length > 0,
  );

  // 6. Token lifetime progression: expired_at and refreshable_until should move forward
  const originalExpiredAt = new Date(originalToken.expired_at).getTime();
  const refreshedExpiredAt = new Date(refreshedToken.expired_at).getTime();
  const originalRefreshableUntil = new Date(
    originalToken.refreshable_until,
  ).getTime();
  const refreshedRefreshableUntil = new Date(
    refreshedToken.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "refreshed access token expiration must be later than original",
    refreshedExpiredAt > originalExpiredAt,
  );

  TestValidator.predicate(
    "refreshable_until after refresh should not move backwards",
    refreshedRefreshableUntil >= originalRefreshableUntil,
  );

  // Additional safety: refreshed refreshable_until should not be earlier than refreshed expired_at
  TestValidator.predicate(
    "refreshable_until must be on or after access token expiry",
    refreshedRefreshableUntil >= refreshedExpiredAt,
  );
}
