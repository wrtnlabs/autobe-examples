import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful guest session refresh with valid refresh token.
 *
 * Prerequisites:
 * 1. Guest joins the platform via POST /hrmPlatform/auth/guest/join to establish initial session
 * 2. Capture the refresh token from the join response
 *
 * Test Steps:
 * 1. Call POST /hrmPlatform/auth/guest/refresh with the valid refresh token obtained from guest join
 * 2. Verify the response returns valid IHrmPlatformGuest.IAuthorized structure
 * 3. Validate response contains new access token, new refresh token, expired_at, and refreshable_until
 * 4. Verify the new access token is different from the original access token
 * 5. Verify the new refresh token is different from the original refresh token (token rotation)
 * 6. Verify expired_at timestamp is extended from the original session expiration
 * 7. Verify refreshable_until timestamp is present and valid
 * 8. Verify the guest id in response matches the original guest id from join
 *
 * Business Logic Validation:
 * - Session is successfully renewed without requiring re-registration with device fingerprint
 * - Token rotation occurs (new tokens issued)
 * - Session duration is extended from current time
 * - Guest identity remains consistent across refresh operations
 */
export async function test_api_guest_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest joins to establish initial session
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformGuest.IJoin,
  });
  typia.assert(joinResult);
  // Capture original tokens and guest id
  const originalGuestId = joinResult.id;
  const originalAccessToken = joinResult.token.access;
  const originalRefreshToken = joinResult.token.refresh;
  const originalExpiredAt = joinResult.token.expired_at;
  const originalRefreshableUntil = joinResult.token.refreshable_until;
  // 2. Refresh the session using the refresh token from join
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_guest_refresh(refreshConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies IHrmPlatformGuest.IRefresh,
  });
  typia.assert(refreshResult);
  // 3. Verify guest id remains consistent
  TestValidator.equals(
    "guest id matches original",
    refreshResult.id,
    originalGuestId,
  );
  // 4. Verify token rotation - new access token is different
  TestValidator.notEquals(
    "access token rotated",
    refreshResult.token.access,
    originalAccessToken,
  );
  // 5. Verify token rotation - new refresh token is different
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResult.token.refresh,
    originalRefreshToken,
  );
  // 6. Verify expired_at is extended (new expiration is later than original)
  const originalExpiredDate = new Date(originalExpiredAt).getTime();
  const newExpiredDate = new Date(refreshResult.token.expired_at).getTime();
  TestValidator.predicate(
    "expired_at is extended",
    newExpiredDate > originalExpiredDate,
  );
  // 7. Verify refreshable_until is present and valid
  const refreshableUntilDate = new Date(
    refreshResult.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refreshable_until is valid date",
    refreshableUntilDate > 0,
  );
  // 8. Verify refreshable_until is not earlier than expired_at
  TestValidator.predicate(
    "refreshable_until >= expired_at",
    refreshableUntilDate >= newExpiredDate,
  );
}
