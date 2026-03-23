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
 * Test guest session refresh after expiration.
 * 1. Register a new guest and obtain initial tokens
 * 2. Attempt to refresh the session using the refresh token
 * 3. Validate new tokens are issued successfully
 * 4. Verify token rotation occurred (new access token differs from original)
 */
export async function test_api_guest_refresh_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest and obtain initial tokens
  const guestConnection1: api.IConnection = { host: connection.host };
  const initialAuth: IHrmPlatformGuest.IAuthorized = await authorize_guest_join(
    guestConnection1,
    {
      body: undefined,
    },
  );
  typia.assert(initialAuth);
  // Store initial access token for comparison
  const initialAccessToken = initialAuth.token.access;
  const refreshToken = initialAuth.token.refresh;
  // 2. Attempt to refresh session (simulating expired session scenario)
  const guestConnection2: api.IConnection = { host: connection.host };
  const refreshedAuth: IHrmPlatformGuest.IAuthorized =
    await authorize_guest_refresh(guestConnection2, {
      body: {
        refresh_token: refreshToken,
      } satisfies IHrmPlatformGuest.IRefresh,
    });
  typia.assert(refreshedAuth);
  // 3. Validate token rotation occurred
  TestValidator.notEquals(
    "access token should be rotated on refresh",
    initialAccessToken,
    refreshedAuth.token.access,
  );
  // 4. Validate guest ID remains consistent
  TestValidator.equals(
    "guest ID should remain the same after refresh",
    initialAuth.id,
    refreshedAuth.id,
  );
  // 5. Validate new refresh token was issued
  TestValidator.notEquals(
    "refresh token should be rotated on refresh",
    refreshToken,
    refreshedAuth.token.refresh,
  );
  // 6. Validate expiration timestamps are present and valid
  TestValidator.predicate(
    "new access token has valid expiration",
    refreshedAuth.token.expired_at !== undefined &&
      refreshedAuth.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "new refresh token has valid expiration",
    refreshedAuth.token.refreshable_until !== undefined &&
      refreshedAuth.token.refreshable_until.length > 0,
  );
}
