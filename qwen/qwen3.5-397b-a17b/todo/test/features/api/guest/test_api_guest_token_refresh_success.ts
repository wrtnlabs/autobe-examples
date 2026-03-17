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

export async function test_api_guest_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest joins to get initial authentication tokens
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
  // 2. Guest refreshes tokens using the refresh token from join
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh: joinResult.token.refresh,
    } satisfies ITodoAppGuest.IRefresh,
  });
  typia.assert(refreshResult);
  // 3. Validate guest identity is preserved
  TestValidator.equals(
    "guest id matches",
    refreshResult.guest.id,
    joinResult.guest.id,
  );
  TestValidator.equals(
    "device fingerprint matches",
    refreshResult.guest.device_fingerprint,
    joinResult.guest.device_fingerprint,
  );
  // 4. Validate new tokens are issued
  TestValidator.predicate(
    "new access token exists",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token exists",
    refreshResult.token.refresh.length > 0,
  );
  // 5. Validate token expiration timestamps
  TestValidator.predicate(
    "access token expiration is valid",
    new Date(refreshResult.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is extended",
    new Date(refreshResult.token.refreshable_until) >=
      new Date(joinResult.token.refreshable_until),
  );
}
