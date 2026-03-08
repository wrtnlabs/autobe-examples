import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create guest account and session via join
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
    },
  });
  typia.assert(joinResponse);
  const originalGuestId = joinResponse.id;
  const originalRefreshToken = joinResponse.token.refresh;
  const originalAccessToken = joinResponse.token.access;
  // Step 2: Call refresh endpoint with the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh: originalRefreshToken,
    } satisfies ICommunityPlatformGuest.IRefresh,
  });
  typia.assert(refreshResponse);
  // Step 3: Validate token rotation - new refresh token must be different
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResponse.token.refresh,
    originalRefreshToken,
  );
  // Step 4: Validate session continuity - same guest ID
  TestValidator.equals(
    "guest ID matches original",
    refreshResponse.id,
    originalGuestId,
  );
  // Step 5: Validate access token changed
  TestValidator.notEquals(
    "access token changed",
    refreshResponse.token.access,
    originalAccessToken,
  );
  // Step 6: Validate tokens are non-empty strings
  TestValidator.predicate(
    "access token is non-empty",
    refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    refreshResponse.token.refresh.length > 0,
  );
  // Step 7: Validate expiration timestamps
  const accessExpiredAt = new Date(refreshResponse.token.expired_at);
  const refreshExpiredAt = new Date(refreshResponse.token.refreshable_until);
  TestValidator.predicate(
    "access token expires before refresh token",
    accessExpiredAt < refreshExpiredAt,
  );
}
