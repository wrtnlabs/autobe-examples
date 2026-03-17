import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session extension through token refresh.
 *
 * This test validates the session lifecycle management for guest users:
 * 1. Guest joins and receives initial authentication tokens
 * 2. Guest refreshes tokens using the refresh endpoint
 * 3. New tokens are issued with extended session lifetime
 * 4. Guest can perform subsequent refresh operations with new tokens
 *
 * This ensures guests can maintain continuous access without re-authentication.
 */
export async function test_api_guest_session_extension(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest joins the application and receives initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(joinResult);
  // Store initial token timestamps for comparison
  const initialExpiredAt = joinResult.token.expired_at;
  const initialRefreshableUntil = joinResult.token.refreshable_until;
  const initialRefreshToken = joinResult.token.refresh;
  // 2. Guest refreshes tokens using the refresh endpoint
  const refreshResult = await authorize_guest_refresh(guestConnection, {
    body: {
      refresh: initialRefreshToken,
    } satisfies ITodoAppGuest.IRefresh,
  });
  typia.assert(refreshResult);
  // 3. Validate new tokens are issued
  TestValidator.notEquals(
    "new access token issued",
    joinResult.token.access,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "new refresh token issued",
    joinResult.token.refresh,
    refreshResult.token.refresh,
  );
  // 4. Validate session lifetime is extended
  const newExpiredAt = new Date(refreshResult.token.expired_at);
  const oldExpiredAt = new Date(initialExpiredAt);
  TestValidator.predicate(
    "expired_at is extended",
    newExpiredAt >= oldExpiredAt,
  );
  const newRefreshableUntil = new Date(refreshResult.token.refreshable_until);
  const oldRefreshableUntil = new Date(initialRefreshableUntil);
  TestValidator.predicate(
    "refreshable_until is extended",
    newRefreshableUntil >= oldRefreshableUntil,
  );
  // 5. Validate guest can perform subsequent refresh with new token
  const secondRefreshResult = await authorize_guest_refresh(guestConnection, {
    body: {
      refresh: refreshResult.token.refresh,
    } satisfies ITodoAppGuest.IRefresh,
  });
  typia.assert(secondRefreshResult);
  TestValidator.notEquals(
    "second refresh issues new tokens",
    refreshResult.token.access,
    secondRefreshResult.token.access,
  );
  TestValidator.predicate(
    "second refresh extends session",
    new Date(secondRefreshResult.token.expired_at) >= newExpiredAt,
  );
  // 6. Validate guest account information remains consistent
  TestValidator.equals(
    "guest id consistent",
    joinResult.guest.id,
    refreshResult.guest.id,
  );
  TestValidator.equals(
    "guest id consistent after second refresh",
    joinResult.guest.id,
    secondRefreshResult.guest.id,
  );
  TestValidator.equals(
    "device fingerprint consistent",
    joinResult.guest.device_fingerprint,
    refreshResult.guest.device_fingerprint,
  );
}
