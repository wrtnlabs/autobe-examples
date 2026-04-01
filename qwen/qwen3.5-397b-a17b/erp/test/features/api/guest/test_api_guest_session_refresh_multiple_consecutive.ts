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
 * Test multiple consecutive guest session refresh operations to validate token rotation and session continuity.
 *
 * This test validates that:
 * 1. Guest can perform multiple consecutive session refreshes
 * 2. Each refresh generates a new token pair (proper token rotation)
 * 3. Session expiration is progressively extended with each refresh
 * 4. Guest identity remains consistent across all refresh operations
 */
export async function test_api_guest_session_refresh_multiple_consecutive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish initial guest session
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
  // Capture initial guest ID and refresh token
  const guestId = joinResult.id;
  let currentRefreshToken = joinResult.token.refresh;
  let previousExpiredAt = joinResult.token.expired_at;
  // 2. Perform first refresh
  const firstRefreshConnection: api.IConnection = { host: connection.host };
  const firstRefreshResult = await authorize_guest_refresh(
    firstRefreshConnection,
    {
      body: {
        refreshToken: currentRefreshToken,
      } satisfies IHrmPlatformGuest.IRefresh,
    },
  );
  typia.assert(firstRefreshResult);
  // Validate first refresh
  TestValidator.equals(
    "guest id preserved after first refresh",
    firstRefreshResult.id,
    guestId,
  );
  TestValidator.notEquals(
    "access token rotated after first refresh",
    firstRefreshResult.token.access,
    joinResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated after first refresh",
    firstRefreshResult.token.refresh,
    currentRefreshToken,
  );
  TestValidator.predicate(
    "expired_at extended after first refresh",
    firstRefreshResult.token.expired_at >= previousExpiredAt,
  );
  // Update tokens for next refresh
  currentRefreshToken = firstRefreshResult.token.refresh;
  previousExpiredAt = firstRefreshResult.token.expired_at;
  // 3. Perform second refresh
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshResult = await authorize_guest_refresh(
    secondRefreshConnection,
    {
      body: {
        refreshToken: currentRefreshToken,
      } satisfies IHrmPlatformGuest.IRefresh,
    },
  );
  typia.assert(secondRefreshResult);
  // Validate second refresh
  TestValidator.equals(
    "guest id preserved after second refresh",
    secondRefreshResult.id,
    guestId,
  );
  TestValidator.notEquals(
    "access token rotated after second refresh",
    secondRefreshResult.token.access,
    firstRefreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated after second refresh",
    secondRefreshResult.token.refresh,
    firstRefreshResult.token.refresh,
  );
  TestValidator.predicate(
    "expired_at extended after second refresh",
    secondRefreshResult.token.expired_at >= previousExpiredAt,
  );
  // Update tokens for next refresh
  currentRefreshToken = secondRefreshResult.token.refresh;
  previousExpiredAt = secondRefreshResult.token.expired_at;
  // 4. Perform third refresh
  const thirdRefreshConnection: api.IConnection = { host: connection.host };
  const thirdRefreshResult = await authorize_guest_refresh(
    thirdRefreshConnection,
    {
      body: {
        refreshToken: currentRefreshToken,
      } satisfies IHrmPlatformGuest.IRefresh,
    },
  );
  typia.assert(thirdRefreshResult);
  // Validate third refresh
  TestValidator.equals(
    "guest id preserved after third refresh",
    thirdRefreshResult.id,
    guestId,
  );
  TestValidator.notEquals(
    "access token rotated after third refresh",
    thirdRefreshResult.token.access,
    secondRefreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated after third refresh",
    thirdRefreshResult.token.refresh,
    secondRefreshResult.token.refresh,
  );
  TestValidator.predicate(
    "expired_at extended after third refresh",
    thirdRefreshResult.token.expired_at >= previousExpiredAt,
  );
}
