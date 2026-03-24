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

export async function test_api_guest_join_success_creates_session_and_tokens(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Unique join inputs
  const device_identifier = RandomGenerator.alphaNumeric(32);
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_identifier,
      ip,
      href,
      referrer,
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "device_identifier echoes input",
    authorized.device_identifier,
    device_identifier,
  );
  TestValidator.equals("deleted_at is null", authorized.deleted_at, null);
  const token: IAuthorizationToken = authorized.token;
  typia.assert(token);
  TestValidator.predicate("access non-empty", token.access.length > 0);
  TestValidator.predicate("refresh non-empty", token.refresh.length > 0);
  const now = new Date();
  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is >= expired_at",
    refreshableUntil.getTime() >= expiredAt.getTime(),
  );
}
