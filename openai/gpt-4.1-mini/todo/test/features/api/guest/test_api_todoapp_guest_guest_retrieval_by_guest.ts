import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_todoapp_guest_guest_retrieval_by_guest(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize guest join
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuthorized: ITodoAppGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {},
  );
  typia.assert(guestAuthorized);
  // Step 2: Retrieve guest data by guestId using guestConnection
  const guestData: ITodoAppGuest = await api.functional.todoApp.guest.guests.at(
    guestConnection,
    { guestId: guestAuthorized.id },
  );
  typia.assert(guestData);
  // Step 3: Validate that the retrieved guest ID matches the authorized guest ID
  TestValidator.equals(
    "retrieved guest ID matches authorized guest ID",
    guestData.id,
    guestAuthorized.id,
  );
}
