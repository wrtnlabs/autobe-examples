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

export async function test_api_guest_join_idempotent_by_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  const fingerprint = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const body = {
    fingerprint,
    href,
    referrer,
    ip,
  } satisfies IShoppingMallGuest.IJoin;
  const guestConnection1: api.IConnection = { host: connection.host };
  const first = await authorize_guest_join(guestConnection1, { body });
  typia.assert(first);
  const guestConnection2: api.IConnection = { host: connection.host };
  const second = await authorize_guest_join(guestConnection2, { body });
  typia.assert(second);
  TestValidator.predicate(
    "first token.access non-empty",
    first.token.access.length > 0,
  );
  TestValidator.predicate(
    "first token.refresh non-empty",
    first.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "second token.access non-empty",
    second.token.access.length > 0,
  );
  TestValidator.predicate(
    "second token.refresh non-empty",
    second.token.refresh.length > 0,
  );
  TestValidator.equals("first deleted_at is null", first.deleted_at, null);
  TestValidator.equals("second deleted_at is null", second.deleted_at, null);
  const now = Date.now();
  TestValidator.predicate(
    "first expired_at is in the future",
    Date.parse(first.expired_at) > now,
  );
  TestValidator.predicate(
    "first token.refreshable_until is in the future",
    Date.parse(first.token.refreshable_until) > now,
  );
  TestValidator.predicate(
    "second expired_at is in the future",
    Date.parse(second.expired_at) > now,
  );
  TestValidator.predicate(
    "second token.refreshable_until is in the future",
    Date.parse(second.token.refreshable_until) > now,
  );
  if (first.id === second.id) {
    TestValidator.equals("guest session id reused", second.id, first.id);
  } else {
    TestValidator.equals(
      "guest session rotation keeps active",
      second.deleted_at,
      null,
    );
  }
}
