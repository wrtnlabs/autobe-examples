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

export async function test_api_guest_current_context_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {} satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(authorized);
  const current = await api.functional.todoApp.guest.guests.at(guestConnection);
  typia.assert(current);
  TestValidator.predicate(
    "guest identifier should be a UUID",
    current.id.length > 0,
  );
  TestValidator.predicate(
    "guest created_at should be present",
    current.created_at.length > 0,
  );
  TestValidator.predicate(
    "guest updated_at should be present",
    current.updated_at.length > 0,
  );
  TestValidator.equals(
    "guest deleted_at should remain null for an active guest",
    current.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "guest current context should not be empty",
    current.id,
    "",
  );
}
