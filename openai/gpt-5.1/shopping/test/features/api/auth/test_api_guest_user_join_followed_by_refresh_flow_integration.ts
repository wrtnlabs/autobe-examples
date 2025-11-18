import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";

/**
 * Validate guest user join + refresh token lifecycle integration.
 *
 * Business goal:
 *
 * - Ensure that the guest user join endpoint (`POST /auth/guestUser/join`)
 *   creates a stable logical guest identity and issues an initial token pair.
 * - Ensure that the refresh endpoint (`POST /auth/guestUser/refresh`) can use the
 *   refresh token from the join response to rotate tokens while preserving the
 *   same guest identity.
 *
 * Flow under test:
 *
 * 1. Call join with a realistic IShoppingMallGuestUser.IJoin payload that contains
 *    an `external_reference` simulating a device/cookie identifier.
 * 2. Assert the join response type (IShoppingMallGuestUser.IAuthorized) and
 *    capture the guest id and authorization token fields.
 * 3. Build an IShoppingMallGuestUser.IRefresh request using the original refresh
 *    token and call the refresh endpoint.
 * 4. Assert the refresh response type and perform business validations:
 *
 *    - Guest id from refresh is identical to the id from join (stable logical
 *         identity).
 *    - Access and refresh tokens are rotated (new values differ from old).
 *    - `expired_at` and `refreshable_until` in the new token are later than in the
 *         original token, using lexicographical comparison of ISO 8601
 *         strings.
 *
 * Error scenarios relying on invalid types or missing required fields are not
 * covered here, as those would violate TypeScript type safety. This test
 * strictly validates the happy-path lifecycle and token rotation semantics.
 */
export async function test_api_guest_user_join_followed_by_refresh_flow_integration(
  connection: api.IConnection,
) {
  // 1. Join as a new guest user with an external_reference to simulate device/cookie.
  const joinBody = {
    external_reference: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallGuestUser.IJoin;

  const joined: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  const originalId = joined.id;
  const originalToken: IAuthorizationToken = joined.token;
  const originalAccess = originalToken.access;
  const originalRefresh = originalToken.refresh;
  const originalExpiredAt = originalToken.expired_at;
  const originalRefreshableUntil = originalToken.refreshable_until;

  // 2. Build refresh request using the refresh token from join.
  const refreshBody = {
    refresh_token: originalRefresh,
  } satisfies IShoppingMallGuestUser.IRefresh;

  const refreshed: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  const refreshedToken: IAuthorizationToken = refreshed.token;

  // 3. Business contract validations
  // Identity must remain stable across join and refresh.
  TestValidator.equals(
    "guest id must remain stable between join and refresh",
    refreshed.id,
    originalId,
  );

  // Access and refresh tokens must be rotated (changed).
  TestValidator.notEquals(
    "access token must be rotated on refresh",
    refreshedToken.access,
    originalAccess,
  );

  TestValidator.notEquals(
    "refresh token must be rotated on refresh",
    refreshedToken.refresh,
    originalRefresh,
  );

  // Expiration timestamps should move forward. Tokens use ISO 8601 date-time
  // strings, so lexicographical comparison is aligned with chronological order.
  TestValidator.predicate(
    "access token expiration must be extended on refresh",
    refreshedToken.expired_at > originalExpiredAt,
  );

  TestValidator.predicate(
    "refresh token refreshable_until must be extended on refresh",
    refreshedToken.refreshable_until > originalRefreshableUntil,
  );
}
