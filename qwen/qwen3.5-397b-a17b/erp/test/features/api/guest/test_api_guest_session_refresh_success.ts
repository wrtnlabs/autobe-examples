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
 * Test guest session token refresh success path.
 *
 * Validates the complete guest session refresh workflow including initial guest account creation, token acquisition, and session renewal. Ensures that the refresh operation returns new access and refresh tokens with extended expiration timestamps while maintaining the same guest identity.
 *
 * The test verifies that the refresh operation succeeds when the session is active and not expired, and that the new tokens have later expiration times than the original tokens.
 *
 * 1. Create guest account via join endpoint to establish initial session and obtain access/refresh tokens.
 * 2. Submit the refresh token to the refresh endpoint to renew the session.
 * 3. Validate response contains valid guest ID matching original account, new access token, new refresh token, and updated expiration timestamps.
 * 4. Verify new expired_at is later than original, confirming session extension.
 */
export async function test_api_guest_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account and obtain initial tokens
  const guestJoinResult = await authorize_guest_join(connection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformGuest.IJoin,
  });
  typia.assert(guestJoinResult);
  // 2. Refresh the session using the refresh token
  const guestRefreshResult = await authorize_guest_refresh(connection, {
    body: {
      refresh_token: guestJoinResult.token.refresh,
    } satisfies IHrmPlatformGuest.IRefresh,
  });
  typia.assert(guestRefreshResult);
  // 3. Validate guest ID matches
  TestValidator.equals(
    "guest ID matches",
    guestRefreshResult.id,
    guestJoinResult.id,
  );
  // 4. Validate new tokens are different from original
  TestValidator.notEquals(
    "access token renewed",
    guestRefreshResult.token.access,
    guestJoinResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token renewed",
    guestRefreshResult.token.refresh,
    guestJoinResult.token.refresh,
  );
  // 5. Validate expiration timestamps are extended
  const originalExpiredAt = new Date(
    guestJoinResult.token.expired_at,
  ).getTime();
  const newExpiredAt = new Date(guestRefreshResult.token.expired_at).getTime();
  TestValidator.predicate(
    "expired_at extended",
    newExpiredAt > originalExpiredAt,
  );
  const originalRefreshableUntil = new Date(
    guestJoinResult.token.refreshable_until,
  ).getTime();
  const newRefreshableUntil = new Date(
    guestRefreshResult.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refreshable_until extended",
    newRefreshableUntil >= originalRefreshableUntil,
  );
}
