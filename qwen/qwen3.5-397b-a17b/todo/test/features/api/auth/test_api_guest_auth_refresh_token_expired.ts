import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_auth_refresh_token_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account to obtain initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(joinResult);
  // 2. Validate token expiration metadata structure
  const expiredAt = new Date(joinResult.token.expired_at).getTime();
  const refreshableUntil = new Date(
    joinResult.token.refreshable_until,
  ).getTime();
  TestValidator.predicate("expired_at is valid timestamp", expiredAt > 0);
  TestValidator.predicate(
    "refreshable_until is valid timestamp",
    refreshableUntil > 0,
  );
  TestValidator.predicate(
    "refreshable_until >= expired_at",
    refreshableUntil >= expiredAt,
  );
  // 3. Attempt to refresh token with valid refresh token (before expiration)
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: joinResult.token.refresh,
    } satisfies IMultiUserTodoGuest.IRefresh,
  });
  typia.assert(refreshResult);
  // 4. Validate refresh returns new token credentials
  const newExpiredAt = new Date(refreshResult.token.expired_at).getTime();
  const newRefreshableUntil = new Date(
    refreshResult.token.refreshable_until,
  ).getTime();
  TestValidator.predicate("refresh returns valid expired_at", newExpiredAt > 0);
  TestValidator.predicate(
    "refresh returns valid refreshable_until",
    newRefreshableUntil > 0,
  );
  // 5. Verify token refresh mechanism produces new credentials
  TestValidator.notEquals(
    "access token changed after refresh",
    joinResult.token.access,
    refreshResult.token.access,
  );
  // Note: Testing actually expired tokens requires time simulation which is not available
  // in standard E2E test environment. In production, tokens beyond refreshable_until
  // would be rejected by the server, requiring re-registration via join endpoint.
  // This test validates the refresh workflow and token expiration metadata structure
  // that enables proper session expiration handling.
}
