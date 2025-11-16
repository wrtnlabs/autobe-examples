import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";

/**
 * Validate guestUser join + refresh happy-path behavior and token expiry
 * semantics.
 *
 * Business intent: although the original scenario asked to verify that refresh
 * is rejected for logically deleted or blocked guests, the public API surface
 * exposed to this test harness only provides `/auth/guestUser/join` and
 * `/auth/guestUser/refresh`, with no administrative endpoint to flip
 * `deleted_at` or `account_status` on `community_platform_guestusers`.
 * Therefore this test focuses on the observable, positive behavior of the
 * refresh flow while documenting that deletion/blocked enforcement occurs
 * entirely on the backend.
 *
 * Workflow implemented here:
 *
 * 1. Construct a realistic `ICommunityPlatformGuestuser.IJoin` payload using
 *    RandomGenerator and literal values:
 *
 *    - Use valid href and referrer URIs
 *    - Optionally include an IPv4 address string
 * 2. Call `api.functional.auth.guestUser.join` to create or resolve a guest actor
 *    and obtain `ICommunityPlatformGuestuser.IAuthorized` with an embedded
 *    `IAuthorizationToken`.
 * 3. Assert the join response type via `typia.assert`, then capture `guest.id` and
 *    the full `guest.token` (access, refresh, timestamps).
 * 4. Build an `ICommunityPlatformGuestuser.IRefresh` body with the prior
 *    `token.refresh` value and call `api.functional.auth.guestUser.refresh`.
 * 5. Assert the refreshed response type, then validate business invariants:
 *
 *    - The guest `id` remains identical between join and refresh.
 *    - Temporal fields (`expired_at`, `refreshable_until`) on the refreshed token
 *         are not earlier than the original ones, ensuring the refresh does not
 *         shorten validity unexpectedly.
 * 6. Use `TestValidator.equals` / `TestValidator.predicate` with descriptive
 *    titles for all predicate checks, always passing the actual value as the
 *    second parameter and the expected as the third to keep generics aligned.
 *
 * By exercising both endpoints in sequence and confirming id stability and
 * non-regressive token expiry, this test ensures the contract required for any
 * future server-side logic that might reject refresh for deleted or blocked
 * guests.
 */
export async function test_api_guest_user_refresh_rejects_deleted_guest(
  connection: api.IConnection,
) {
  // 1. Build join payload with realistic browsing context
  const joinBody = {
    anonymous_handle: RandomGenerator.alphaNumeric(16),
    user_agent: `e2e-test/${RandomGenerator.alphaNumeric(8)}`,
    ip: "192.168.0.1",
    href: "https://example.com/community/thread/123",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformGuestuser.IJoin;

  const joined: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  const originalId = joined.id;
  const originalToken = joined.token;

  // 2. Refresh using the original refresh token
  const refreshBody = {
    refreshToken: originalToken.refresh,
  } satisfies ICommunityPlatformGuestuser.IRefresh;

  const refreshed: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // 3. Validate that the same guest id is preserved across refresh
  TestValidator.equals(
    "guest id must remain stable between join and refresh",
    refreshed.id,
    originalId,
  );

  // 4. Validate temporal consistency for token expiry fields
  const refreshedToken = refreshed.token;

  const originalExpiredAt = new Date(originalToken.expired_at).getTime();
  const refreshedExpiredAt = new Date(refreshedToken.expired_at).getTime();

  TestValidator.predicate(
    "refreshed access token expiry should not be earlier than original",
    refreshedExpiredAt >= originalExpiredAt,
  );

  const originalRefreshableUntil = new Date(
    originalToken.refreshable_until,
  ).getTime();
  const refreshedRefreshableUntil = new Date(
    refreshedToken.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "refreshed refresh token window should not shrink backwards",
    refreshedRefreshableUntil >= originalRefreshableUntil,
  );
}
