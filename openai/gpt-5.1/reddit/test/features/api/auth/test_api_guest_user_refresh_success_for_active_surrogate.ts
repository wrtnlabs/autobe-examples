import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";

/**
 * Validate successful guestUser token refresh for an active surrogate.
 *
 * This test exercises the happy-path flow for a guestUser pseudo-identity
 * managed via the `community_platform_guestusers` table:
 *
 * 1. Call POST /auth/guestUser/join to create a new surrogate record and receive
 *    an `ICommunityPlatformGuestuser.IAuthorized` envelope.
 * 2. Extract the `token.refresh` value from the join response and build an
 *    `ICommunityPlatformGuestuser.IRefresh` payload.
 * 3. Call POST /auth/guestUser/refresh with the refresh-token payload, relying
 *    entirely on the SDK to handle Authorization headers.
 * 4. Assert that the refreshed authorized context:
 *
 *    - Has the same `id` as the original guestUser surrogate.
 *    - Returns a valid `IAuthorizationToken` bundle.
 *    - Issues different token values from the original bundle to enforce token
 *         rotation semantics (access, refresh, and expiries should all differ
 *         in typical implementations).
 *
 * The business goal is to guarantee continuity of the guestUser pseudo-identity
 * while rotating its token bundle via the refresh endpoint.
 */
export async function test_api_guest_user_refresh_success_for_active_surrogate(
  connection: api.IConnection,
) {
  // 1. Join as guestUser to obtain initial authorized context
  const joined: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(connection);
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(joined);

  const originalId = joined.id;
  const originalToken: IAuthorizationToken = joined.token;
  typia.assert<IAuthorizationToken>(originalToken);

  // 2. Build refresh payload using the issued refresh token
  const refreshBody = {
    refreshToken: originalToken.refresh,
  } satisfies ICommunityPlatformGuestuser.IRefresh;

  // 3. Call refresh endpoint with the refresh token payload
  const refreshed: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(refreshed);

  const refreshedId = refreshed.id;
  const refreshedToken: IAuthorizationToken = refreshed.token;
  typia.assert<IAuthorizationToken>(refreshedToken);

  // 4. Business assertions
  // 4-1. Identity continuity: surrogate id must remain the same
  TestValidator.equals(
    "guestUser id must remain stable across refresh",
    refreshedId,
    originalId,
  );

  // 4-2. Token bundle must be rotated (new access/refresh and expiries)
  TestValidator.notEquals(
    "access token must be rotated on refresh",
    refreshedToken.access,
    originalToken.access,
  );

  TestValidator.notEquals(
    "refresh token should be rotated on refresh",
    refreshedToken.refresh,
    originalToken.refresh,
  );

  TestValidator.notEquals(
    "access token expiry should be updated on refresh",
    refreshedToken.expired_at,
    originalToken.expired_at,
  );

  TestValidator.notEquals(
    "refresh token expiry should be updated on refresh",
    refreshedToken.refreshable_until,
    originalToken.refreshable_until,
  );
}
