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
 * Test consecutive guest token refresh operations to verify token rotation
 * works correctly across multiple refresh cycles.
 *
 * 1. Join as guest to get initial tokens
 * 2. First refresh using initial refresh token
 * 3. Second refresh using tokens from first refresh
 * 4. Verify each refresh returns unique tokens
 * 5. Verify guest ID remains consistent across all operations
 */
export async function test_api_guest_refresh_multiple_times(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as guest to get initial tokens
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
  // 2. First refresh using the refresh token from join
  const firstRefreshConnection: api.IConnection = { host: connection.host };
  const firstRefreshResult = await authorize_guest_refresh(
    firstRefreshConnection,
    {
      body: {
        refresh_token: joinResult.token.refresh,
      } satisfies IHrmPlatformGuest.IRefresh,
    },
  );
  typia.assert(firstRefreshResult);
  // 3. Second refresh using the refresh token from first refresh
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshResult = await authorize_guest_refresh(
    secondRefreshConnection,
    {
      body: {
        refresh_token: firstRefreshResult.token.refresh,
      } satisfies IHrmPlatformGuest.IRefresh,
    },
  );
  typia.assert(secondRefreshResult);
  // 4. Verify guest ID remains consistent across all operations
  TestValidator.equals(
    "guest ID consistent after first refresh",
    joinResult.id,
    firstRefreshResult.id,
  );
  TestValidator.equals(
    "guest ID consistent after second refresh",
    joinResult.id,
    secondRefreshResult.id,
  );
  // 5. Verify each refresh returns unique tokens (token rotation)
  TestValidator.notEquals(
    "access token changed after first refresh",
    joinResult.token.access,
    firstRefreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed after first refresh",
    joinResult.token.refresh,
    firstRefreshResult.token.refresh,
  );
  TestValidator.notEquals(
    "access token changed after second refresh",
    firstRefreshResult.token.access,
    secondRefreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed after second refresh",
    firstRefreshResult.token.refresh,
    secondRefreshResult.token.refresh,
  );
  // 6. Verify expiration times are extended with each refresh
  TestValidator.predicate(
    "first refresh extends expiration",
    new Date(firstRefreshResult.token.expired_at) >
      new Date(joinResult.token.expired_at),
  );
  TestValidator.predicate(
    "second refresh extends expiration",
    new Date(secondRefreshResult.token.expired_at) >
      new Date(firstRefreshResult.token.expired_at),
  );
}
