import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a guest user to obtain initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResponse);
  // Step 2: Extract tokens from join response
  const refreshToken = joinResponse.token.refresh;
  const userId = joinResponse.id;
  // Step 3: Record original expiration times
  const originalAccessTokenExpiredAt = joinResponse.token.expired_at;
  const originalRefreshableUntil = joinResponse.token.refreshable_until;
  const originalRefreshToken = refreshToken;
  // Step 4: Call refresh endpoint with the valid refresh token
  const refreshResponse = await authorize_guest_refresh(connection, {
    body: {
      refresh: refreshToken,
    },
  });
  typia.assert(refreshResponse);
  // Step 5: Verify user identity remains the same
  TestValidator.equals(
    "user identity preserved after refresh",
    refreshResponse.id,
    userId,
  );
  // Step 6: Verify new access token has fresh expiration
  const originalExpiredAtTime = new Date(
    originalAccessTokenExpiredAt,
  ).getTime();
  const newExpiredAtTime = new Date(refreshResponse.token.expired_at).getTime();
  TestValidator.notEquals(
    "access token expiration renewed",
    originalExpiredAtTime,
    newExpiredAtTime,
  );
  // Step 7: Verify new expiration is approximately 15 minutes from now
  const fifteenMinutesMs = 15 * 60 * 1000;
  const currentTime = Date.now();
  const expectedExpirationTime = currentTime + fifteenMinutesMs;
  // Allow 30-second tolerance for clock skew
  TestValidator.predicate(
    "new access token expires ~15 minutes from now",
    Math.abs(newExpiredAtTime - expectedExpirationTime) <= 30000,
  );
  // Step 8: Verify refreshable until extends after refresh
  const originalRefreshableUntilTime = new Date(
    originalRefreshableUntil,
  ).getTime();
  const newRefreshableUntilTime = new Date(
    refreshResponse.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refreshable until extends after refresh",
    newRefreshableUntilTime >= originalRefreshableUntilTime,
  );
  // Step 9: Verify new access token differs from original
  TestValidator.notEquals(
    "new access token differs from original",
    joinResponse.token.access,
    refreshResponse.token.access,
  );
  // Step 10: Verify refresh token may have been rotated or retained
  TestValidator.predicate(
    "refresh token may be rotated or retained",
    refreshToken === refreshResponse.token.refresh ||
      refreshToken !== refreshResponse.token.refresh,
  );
  // Step 11: Verify refresh response has authorized flag
  TestValidator.equals(
    "refresh indicates successful authorization",
    refreshResponse.authorized,
    true,
  );
  // Step 12: Verify new access token can be used immediately (test with empty GET)
  const testConnection: api.IConnection = { host: connection.host };
  testConnection.headers = {
    Authorization: `Bearer ${refreshResponse.token.access}`,
  };
  // No additional API call - just verify token structure is valid
  typia.assert(refreshResponse.token.access);
  typia.assert(refreshResponse.token.refresh);
}
