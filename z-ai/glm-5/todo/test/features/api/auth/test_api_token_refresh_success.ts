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

export async function test_api_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection and register a new member account
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(guestConnection, {});
  typia.assert(joinResponse);
  // 2. Store initial tokens and user id for comparison
  const originalUserId = joinResponse.id;
  const originalAccessToken = joinResponse.token.access;
  const originalRefreshToken = joinResponse.token.refresh;
  // 3. Create new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 4. Prepare refresh request body
  const refreshBody = {
    refreshToken: originalRefreshToken,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies ITodoAppGuest.IRefresh;
  // 5. Call refresh endpoint using utility function
  const refreshResponse = await authorize_guest_refresh(refreshConnection, {
    body: refreshBody,
  });
  typia.assert(refreshResponse);
  // 6. Validate user identity preservation
  TestValidator.equals("user id preserved", refreshResponse.id, originalUserId);
  // 7. Validate token rotation - new tokens should be different
  TestValidator.notEquals(
    "access token rotated",
    refreshResponse.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResponse.token.refresh,
    originalRefreshToken,
  );
  // 8. Validate token expiration timestamps are in the future
  const now = new Date();
  const expiredAt = new Date(refreshResponse.token.expired_at);
  const refreshableUntil = new Date(refreshResponse.token.refreshable_until);
  TestValidator.predicate("access token expires in future", expiredAt > now);
  TestValidator.predicate(
    "refresh token valid until future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until after expired_at",
    refreshableUntil > expiredAt,
  );
}
