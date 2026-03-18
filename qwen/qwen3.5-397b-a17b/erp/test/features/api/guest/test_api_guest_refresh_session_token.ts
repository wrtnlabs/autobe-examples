import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import type { IHrmPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session token refresh functionality.
 *
 * This test validates the complete guest session refresh workflow:
 * 1. Create initial guest session via join endpoint
 * 2. Extract refresh_token from join response
 * 3. Call refresh endpoint with valid refresh_token
 * 4. Verify token rotation (new access and refresh tokens)
 * 5. Validate guest ID remains consistent
 * 6. Confirm session expiration is extended
 */
export async function test_api_guest_refresh_session_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial guest session to obtain refresh token
  const guestJoin = await authorize_guest_join(connection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformGuest.IJoin,
  });
  typia.assert(guestJoin);
  // 2. Extract tokens and guest information from initial join
  const originalRefreshToken = guestJoin.token.refresh;
  const originalAccessToken = guestJoin.token.access;
  const guestId = guestJoin.id;
  const originalExpiredAt = guestJoin.token.expired_at;
  const originalRefreshableUntil = guestJoin.token.refreshable_until;
  // 3. Refresh the session using the refresh token
  const refreshedGuest = await authorize_guest_refresh(connection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IHrmPlatformGuest.IRefresh,
  });
  typia.assert(refreshedGuest);
  // 4. Validate guest ID remains the same
  TestValidator.equals("guest ID matches", refreshedGuest.id, guestId);
  TestValidator.equals(
    "device fingerprint matches",
    refreshedGuest.device_fingerprint,
    guestJoin.device_fingerprint,
  );
  // 5. Validate token rotation (new tokens must be different)
  TestValidator.notEquals(
    "access token rotated",
    refreshedGuest.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedGuest.token.refresh,
    originalRefreshToken,
  );
  // 6. Validate session expiration is extended
  TestValidator.predicate(
    "expired_at extended",
    new Date(refreshedGuest.token.expired_at) > new Date(originalExpiredAt),
  );
  TestValidator.predicate(
    "refreshable_until extended",
    new Date(refreshedGuest.token.refreshable_until) >
      new Date(originalRefreshableUntil),
  );
  // 7. Validate token format and structure
  TestValidator.predicate(
    "access token is non-empty",
    refreshedGuest.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    refreshedGuest.token.refresh.length > 0,
  );
}
