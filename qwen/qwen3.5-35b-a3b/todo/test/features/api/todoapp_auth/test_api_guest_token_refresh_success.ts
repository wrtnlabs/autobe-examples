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
  // 1. Register guest account and obtain initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(initialAuth);
  // 2. Create connection with initial access token
  const initialConnection: api.IConnection = { host: connection.host };
  initialConnection.headers = { Authorization: initialAuth.token.access };
  // 3. Refresh token with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh: initialAuth.token.refresh,
    } satisfies ITodoAppGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 4. Verify new tokens are different from old tokens (token rotation)
  TestValidator.notEquals(
    "access token rotated",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    initialAuth.token.refresh,
    refreshedAuth.token.refresh,
  );
  // 5. Validate new tokens have proper format
  typia.assert(refreshedAuth.token.access);
  typia.assert(refreshedAuth.token.refresh);
  typia.assert(refreshedAuth.token.expired_at);
  typia.assert(refreshedAuth.token.refreshable_until);
  // 6. Validate user identity remains consistent after refresh
  TestValidator.equals(
    "user identity preserved",
    initialAuth.id,
    refreshedAuth.id,
  );
  TestValidator.equals(
    "email preserved after refresh",
    initialAuth.email,
    refreshedAuth.email,
  );
  // 7. Validate new access token is usable by verifying it has updated expiration
  const refreshedExpiredAt = new Date(refreshedAuth.token.expired_at);
  TestValidator.predicate(
    "new access token has valid expiration",
    refreshedExpiredAt > new Date(),
  );
  const refreshedRefreshableUntil = new Date(
    refreshedAuth.token.refreshable_until,
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshedRefreshableUntil > new Date(),
  );
  // 8. Create connection with new access token and verify it works
  const newConnection: api.IConnection = { host: connection.host };
  newConnection.headers = { Authorization: refreshedAuth.token.access };
  typia.assert(newConnection.headers?.Authorization);
}
