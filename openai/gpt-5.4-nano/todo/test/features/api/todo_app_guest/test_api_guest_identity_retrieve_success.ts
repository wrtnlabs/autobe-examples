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

export async function test_api_guest_identity_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create guest identity (and an active guest session) via join
  const guestConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_guest_join(guestConnection, {
    body: {
      device_identifier: typia.random<string>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(joined);
  const guestId = joined.id;
  TestValidator.predicate(
    "device_identifier is non-empty after join",
    joined.device_identifier.length > 0,
  );
  // 2) Retrieve the guest identity twice
  const retrieveConnection: api.IConnection = { host: connection.host };
  const guest1 = await api.functional.todoApp.guests.at(retrieveConnection, {
    guestId,
  });
  typia.assert(guest1);
  const guest2 = await api.functional.todoApp.guests.at(retrieveConnection, {
    guestId,
  });
  typia.assert(guest2);
  // 3) Validate identity fields
  TestValidator.equals("guest1.id", guest1.id, guestId);
  TestValidator.equals("guest2.id", guest2.id, guestId);
  TestValidator.equals(
    "device_identifier consistent across reads",
    guest1.device_identifier,
    guest2.device_identifier,
  );
  TestValidator.predicate(
    "device_identifier is non-empty",
    guest1.device_identifier.length > 0,
  );
  TestValidator.equals("deleted_at is null", guest1.deleted_at, null);
  TestValidator.equals(
    "deleted_at is null on second read",
    guest2.deleted_at,
    null,
  );
  // 4) Read behavior: GET should not modify key identity fields.
  TestValidator.equals("id stable across reads", guest1.id, guest2.id);
  TestValidator.equals(
    "device_identifier stable across reads",
    guest1.device_identifier,
    guest2.device_identifier,
  );
  TestValidator.equals(
    "deleted_at stable across reads",
    guest1.deleted_at,
    guest2.deleted_at,
  );
}
