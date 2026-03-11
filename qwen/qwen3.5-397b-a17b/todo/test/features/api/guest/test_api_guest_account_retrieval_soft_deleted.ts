import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_account_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest account using utility function
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve the guest account details using guestId
  const guest: ITodoAppGuest = await api.functional.todoApp.guests.at(
    connection,
    {
      guestId: authorized.id,
    },
  );
  typia.assert(guest);
  // 3. Validate guest entity structure
  TestValidator.equals("guest id matches", guest.id, authorized.id);
  TestValidator.equals(
    "device fingerprint matches",
    guest.device_fingerprint,
    authorized.device_fingerprint,
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    () => guest.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    () => guest.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is null or ISO date",
    () => guest.deleted_at === null || guest.deleted_at.length > 0,
  );
}
