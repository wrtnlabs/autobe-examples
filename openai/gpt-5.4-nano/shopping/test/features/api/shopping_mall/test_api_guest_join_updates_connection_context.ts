import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_updates_connection_context(
  connection: api.IConnection,
): Promise<void> {
  const fingerprint = typia.random<string>();
  const guestJoinInput1 = {
    fingerprint,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallGuest.IJoin;
  const guestConnection1: api.IConnection = { host: connection.host };
  const authorized1 = await authorize_guest_join(guestConnection1, {
    body: guestJoinInput1,
  });
  typia.assert(authorized1);
  TestValidator.equals(
    "guest session should not be soft-deleted (first join)",
    authorized1.deleted_at,
    null,
  );
  TestValidator.predicate(
    "guest session should not be expired (first join)",
    new Date(authorized1.expired_at).getTime() > Date.now(),
  );
  const guestJoinInput2 = {
    fingerprint,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallGuest.IJoin;
  const guestConnection2: api.IConnection = { host: connection.host };
  const authorized2 = await authorize_guest_join(guestConnection2, {
    body: guestJoinInput2,
  });
  typia.assert(authorized2);
  TestValidator.equals(
    "guest session should not be soft-deleted (second join)",
    authorized2.deleted_at,
    null,
  );
  TestValidator.predicate(
    "guest session should not be expired (second join)",
    new Date(authorized2.expired_at).getTime() > Date.now(),
  );
  TestValidator.equals(
    "href should be updated to latest request context (second join)",
    authorized2.href,
    guestJoinInput2.href,
  );
  TestValidator.equals(
    "referrer should be updated to latest request context (second join)",
    authorized2.referrer,
    guestJoinInput2.referrer,
  );
  TestValidator.equals(
    "ip should be updated to latest request context (second join)",
    authorized2.ip,
    guestJoinInput2.ip,
  );
}
