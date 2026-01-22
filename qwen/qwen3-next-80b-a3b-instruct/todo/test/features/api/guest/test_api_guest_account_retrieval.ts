import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
export async function test_api_guest_account_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid guest ID using UUID format
  const guestId = typia.random<string & tags.Format<"uuid">>();
  // Create an unauthenticated guest connection (base connection with host only)
  const guestConnection: api.IConnection = { host: connection.host };
  // Call the API to retrieve guest account information
  const guestData: ITodoListGuest = await api.functional.todoList.guests.at(
    guestConnection,
    {
      guestId: guestId,
    },
  );
  // Validate the response structure and types using typia.assert
  typia.assert(guestData);
  // Verify the guest ID matches the requested ID
  TestValidator.equals("guest ID matches requested ID", guestData.id, guestId);
}
