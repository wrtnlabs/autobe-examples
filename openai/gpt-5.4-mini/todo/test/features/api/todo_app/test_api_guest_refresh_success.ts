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

export async function test_api_guest_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_guest_join(guestConnection, {
    body: {
      href: `https://example.com/${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/${RandomGenerator.alphabets(8)}`,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(joined);
  const refreshBody = {
    refreshToken: joined.token.refresh,
  } satisfies ITodoAppGuest.IRefresh;
  const refreshed = await authorize_guest_refresh(guestConnection, {
    body: refreshBody,
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "guest id should remain the same after refresh",
    refreshed.id,
    joined.id,
  );
  TestValidator.notEquals(
    "access token should be renewed on refresh",
    refreshed.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated on refresh",
    refreshed.token.refresh,
    joined.token.refresh,
  );
  TestValidator.predicate(
    "refreshed access expiration should be a valid date-time string",
    () => refreshed.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshed refreshable deadline should be a valid date-time string",
    () => refreshed.token.refreshable_until.length > 0,
  );
}
