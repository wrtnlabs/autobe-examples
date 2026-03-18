import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_update_success(
  connection: api.IConnection,
): Promise<void> {
  const guestBaseConnection: api.IConnection = { host: connection.host };
  const join = await authorize_guest_join(guestBaseConnection, {
    body: {
      fingerprint: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  const guestConnection: api.IConnection = { host: connection.host };
  guestConnection.headers ??= {};
  guestConnection.headers.Authorization = join.token.access;
  typia.assert(join);

  const request1 = {} satisfies IShoppingMallSession.IRequest;
  const updated1 =
    await api.functional.shoppingMall.guest.sessions.updateSession(
      guestConnection,
      { body: request1 },
    );
  typia.assert(updated1);
  TestValidator.equals("session id matches", updated1.id, join.id);
  TestValidator.predicate("deletedAt is null", updated1.deletedAt === null);
  TestValidator.predicate(
    "adminId is undefined for guest session",
    updated1.adminId === undefined,
  );
  TestValidator.predicate(
    "memberId is undefined for guest session",
    updated1.memberId === undefined,
  );
  const now = new Date().toISOString();
  TestValidator.predicate("session not expired", updated1.expiredAt > now);

  const request2 = {} satisfies IShoppingMallSession.IRequest;
  const updated2 =
    await api.functional.shoppingMall.guest.sessions.updateSession(
      guestConnection,
      { body: request2 },
    );
  typia.assert(updated2);
  TestValidator.equals("same session id", updated2.id, updated1.id);
  TestValidator.equals("deletedAt remains null", updated2.deletedAt, null);
  TestValidator.predicate(
    "session still not expired",
    updated2.expiredAt > now,
  );
  TestValidator.predicate(
    "updatedAt advanced",
    updated2.updatedAt >= updated1.updatedAt,
  );
}
