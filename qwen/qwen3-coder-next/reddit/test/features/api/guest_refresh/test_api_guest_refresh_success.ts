import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
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
  // Step 1: Join as guest to establish initial session
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphabets(32),
    } satisfies IRedditPlatformGuest.IJoin,
  });
  typia.assert(joinResponse);
  // Step 2: Extract refresh token from initial authorization
  const initialRefreshToken = joinResponse.token.refresh;
  // Step 3: Test guest refresh with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_guest_refresh(refreshConnection, {
    body: {
      refreshToken: initialRefreshToken,
    } satisfies IRedditPlatformGuest.IRefresh,
  });
  typia.assert(refreshResponse);
  // Step 4: Validate response structure
  TestValidator.equals("id matches", refreshResponse.id, joinResponse.id);
  TestValidator.predicate(
    "has valid access token",
    refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    refreshResponse.token.refresh.length > 0,
  );
  // Step 5: Validate token expiration timestamps
  TestValidator.predicate(
    "access token has future expiration",
    new Date(refreshResponse.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token has future expiration",
    new Date(refreshResponse.token.refreshable_until) > new Date(),
  );
  // Step 6: Verify new tokens are different from initial tokens
  TestValidator.notEquals(
    "access tokens differ",
    refreshResponse.token.access,
    joinResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens differ",
    refreshResponse.token.refresh,
    joinResponse.token.refresh,
  );
  // Step 7: Validate that old refresh token is no longer valid
  await TestValidator.error("old refresh token rejected", async () => {
    await api.functional.redditPlatform.auth.guest.refresh(refreshConnection, {
      body: {
        refreshToken: initialRefreshToken,
      } satisfies IRedditPlatformGuest.IRefresh,
    });
  });
}
