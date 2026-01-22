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
export async function test_api_guest_update_by_authenticated_guest(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authorize a new guest user using the utility function authorize_guest_join
  const guestConnection: api.IConnection = { host: connection.host };
  const guest: ITodoAppGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {},
  );
  typia.assert(guest);
  // Step 2: Prepare the updated guest_identifier string
  const updatedGuestIdentifier: string = RandomGenerator.alphaNumeric(16);
  // Step 3: Call the update SDK function api.functional.todoApp.guest.guests.update
  const updatedGuest: ITodoAppGuest =
    await api.functional.todoApp.guest.guests.update(guestConnection, {
      guestId: guest.id,
      body: {
        guest_identifier: updatedGuestIdentifier,
      } satisfies ITodoAppGuest.IUpdate,
    });
  typia.assert(updatedGuest);
  // Step 4: Assertions to validate that the updated guest has correct id and updated guestIdentifier
  TestValidator.equals(
    "updated guest id matches authenticated guest id",
    updatedGuest.id,
    guest.id,
  );
  TestValidator.equals(
    "updated guestIdentifier matches updated value",
    updatedGuest.guestIdentifier,
    updatedGuestIdentifier,
  );
  TestValidator.predicate(
    "updatedAt is not null after update",
    updatedGuest.updatedAt !== null && updatedGuest.updatedAt !== undefined,
  );
}
