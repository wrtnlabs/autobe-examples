import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";

/**
 * Validate that guest authorization refresh renews tokens while preserving
 * guest identity.
 *
 * Business goal:
 *
 * - Ensure that a guest user who has previously joined via /auth/guestUser/join
 *   can successfully renew their authorization using /auth/guestUser/refresh
 *   with a valid refreshToken.
 * - Confirm that identity-level fields remain stable while token information
 *   (access/refresh and their expirations) is rotated or extended.
 *
 * Scenario steps:
 *
 * 1. Perform a guest join using api.functional.auth.guestUser.join with a valid
 *    ICommunityPlatformGuestuser.IJoin payload, capturing the resulting
 *    ICommunityPlatformGuestuser.IAuthorized structure.
 * 2. Extract guest id and initial token fields (access, refresh, expired_at,
 *    refreshable_until) from the join response.
 * 3. Call api.functional.auth.guestUser.refresh with a body containing the
 *    refreshToken from step 2, typed as ICommunityPlatformGuestuser.IRefresh.
 * 4. Assert that refresh returns a valid ICommunityPlatformGuestuser.IAuthorized
 *    payload.
 * 5. Verify that the refreshed payload has the same guest id as the original join
 *    response, proving continuity of identity.
 * 6. Verify that the new token.access differs from the original token.access, and
 *    that token.refresh also changes, modeling standard token rotation.
 * 7. Validate that token.expired_at from refresh is later than the original
 *    expired_at, indicating extended access lifetime.
 * 8. Validate that token.refreshable_until from refresh is later than or equal to
 *    the original value (never shortened in this scenario).
 * 9. Confirm that immutable guest identity properties (anonymous_handle,
 *    user_agent, created_at) remain equal between original and refreshed
 *    payloads, and that deleted_at remains equal as well.
 * 10. If account_status is defined in the join response, assert that the refreshed
 *     response also contains an account_status with the same id, preserving
 *     status semantics.
 * 11. Do not touch connection.headers in the test; rely only on DTO data for
 *     assertions even though the SDK updates Authorization behind the scenes.
 */
export async function test_api_guest_user_refresh_renews_authorization(
  connection: api.IConnection,
) {
  // 1. Perform guest join to obtain initial authorized guest payload
  const joinBody = {
    href: "https://example.com/landing",
    referrer: "https://example.com/",
  } satisfies ICommunityPlatformGuestuser.IJoin;

  const initialAuth: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(initialAuth);

  // 2. Extract identity and token information from join response
  const originalGuestId = initialAuth.id;
  const originalToken: IAuthorizationToken = initialAuth.token;
  typia.assert<IAuthorizationToken>(originalToken);

  const originalAccess = originalToken.access;
  const originalRefresh = originalToken.refresh;
  const originalExpiredAt = originalToken.expired_at;
  const originalRefreshableUntil = originalToken.refreshable_until;

  // 3. Call refresh endpoint with refreshToken from join
  const refreshBody = {
    refreshToken: originalRefresh,
  } satisfies ICommunityPlatformGuestuser.IRefresh;

  const refreshedAuth: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(refreshedAuth);

  const refreshedToken: IAuthorizationToken = refreshedAuth.token;
  typia.assert<IAuthorizationToken>(refreshedToken);

  // 4. Identity continuity: ids must match
  TestValidator.equals(
    "guest id should remain the same after refresh",
    refreshedAuth.id,
    originalGuestId,
  );

  // 5. Token rotation: access and refresh tokens should change
  TestValidator.notEquals(
    "access token should be rotated on refresh",
    refreshedToken.access,
    originalAccess,
  );
  TestValidator.notEquals(
    "refresh token should be rotated on refresh",
    refreshedToken.refresh,
    originalRefresh,
  );

  // 6. Token expiry extension: refreshed expiration should be later than original
  const originalExpiredTime = new Date(originalExpiredAt).getTime();
  const refreshedExpiredTime = new Date(refreshedToken.expired_at).getTime();
  TestValidator.predicate(
    "refreshed access token expiration should be later than original",
    refreshedExpiredTime > originalExpiredTime,
  );

  // 7. Refreshable window: refreshed refreshable_until should be >= original
  const originalRefreshableTime = new Date(originalRefreshableUntil).getTime();
  const refreshedRefreshableTime = new Date(
    refreshedToken.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refreshed refreshable_until should be later than or equal to original",
    refreshedRefreshableTime >= originalRefreshableTime,
  );

  // 8. Immutable identity fields should remain stable
  TestValidator.equals(
    "anonymous_handle should remain stable across refresh",
    refreshedAuth.anonymous_handle ?? null,
    initialAuth.anonymous_handle ?? null,
  );
  TestValidator.equals(
    "user_agent should remain stable across refresh",
    refreshedAuth.user_agent,
    initialAuth.user_agent,
  );
  TestValidator.equals(
    "created_at should remain stable across refresh",
    refreshedAuth.created_at,
    initialAuth.created_at,
  );
  TestValidator.equals(
    "deleted_at should remain stable across refresh",
    refreshedAuth.deleted_at ?? null,
    initialAuth.deleted_at ?? null,
  );

  // 9. Account status, when present, must be preserved
  if (initialAuth.account_status !== undefined) {
    TestValidator.predicate(
      "refreshed payload should include account_status when original did",
      refreshedAuth.account_status !== undefined,
    );

    if (refreshedAuth.account_status !== undefined) {
      const initialStatus: ICommunityPlatformAccountStatus.ISummary =
        initialAuth.account_status;
      const refreshedStatus: ICommunityPlatformAccountStatus.ISummary =
        refreshedAuth.account_status;

      TestValidator.equals(
        "account_status id should remain the same across refresh",
        refreshedStatus.id,
        initialStatus.id,
      );
    }
  }

  // Note: Do not inspect or modify connection.headers here; the SDK manages
  // Authorization header side effects internally. This test focuses solely on
  // DTO-level behavior.
}
