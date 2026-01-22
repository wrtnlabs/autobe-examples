import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListToken";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_account_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create guest account using authorization function
  const guestConnection: api.IConnection = { host: connection.host };
  const guest: ITodoListGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {},
    },
  );
  typia.assert(guest);
  // Step 2: Update guest account using the guestId from the created account
  // ITodoListGuest.IUpdate is empty ({}), so we pass an empty object
  const updatedGuest: ITodoListGuest =
    await api.functional.todoList.guests.update(guestConnection, {
      guestId: guest.id,
      body: {},
    });
  typia.assert(updatedGuest);
  // Step 3: Validate that the updated guest account matches the original
  // Since IUpdate is empty, no fields should change in the update
  TestValidator.equals("guest ID preserved", updatedGuest.id, guest.id);
  TestValidator.equals(
    "creation timestamp preserved",
    updatedGuest.createdAt,
    guest.createdAt,
  );
  TestValidator.equals(
    "active status preserved",
    updatedGuest.isActive,
    guest.isActive,
  );
}
