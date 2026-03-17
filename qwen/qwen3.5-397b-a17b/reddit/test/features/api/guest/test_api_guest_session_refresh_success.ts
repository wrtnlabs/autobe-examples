import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial guest account to obtain credentials
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(joinResult);
  // 2. Refresh the session using the refresh token from join
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: joinResult.token.refresh,
    } satisfies IRedditCloneGuest.IRefresh,
  });
  typia.assert(refreshResult);
  // 3. Validate guest account ID remains the same (not re-created)
  TestValidator.equals("guest ID unchanged", refreshResult.id, joinResult.id);
  // 4. Validate new tokens are different from original (token rotation)
  TestValidator.notEquals(
    "access token refreshed",
    refreshResult.token.access,
    joinResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token refreshed",
    refreshResult.token.refresh,
    joinResult.token.refresh,
  );
  // 5. Validate expiration timestamps are extended
  TestValidator.predicate(
    "expired_at extended",
    new Date(refreshResult.token.expired_at) >
      new Date(joinResult.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until extended",
    new Date(refreshResult.token.refreshable_until) >=
      new Date(joinResult.token.refreshable_until),
  );
}
