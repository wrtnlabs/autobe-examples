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

export async function test_api_guest_refresh_preserves_guest_identity(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_guest_join(guestConnection, {
    body: {
      href: `https://example.com/todo-app/guest-entry/${RandomGenerator.alphabets(8)}`,
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(joined);
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_guest_refresh(refreshConnection, {
    body: {
      refreshToken: joined.token.refresh,
    } satisfies ITodoAppGuest.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "guest identity should be preserved",
    refreshed.id,
    joined.id,
  );
  TestValidator.predicate(
    "refreshed access expiration should be valid",
    Date.parse(refreshed.token.expired_at) > Date.now(),
  );
  TestValidator.predicate(
    "refreshed session expiration should be valid",
    Date.parse(refreshed.token.refreshable_until) >=
      Date.parse(refreshed.token.expired_at),
  );
}
