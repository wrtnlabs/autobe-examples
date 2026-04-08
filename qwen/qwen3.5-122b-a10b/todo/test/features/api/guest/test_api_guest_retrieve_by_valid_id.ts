import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_retrieve_by_valid_id(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID for guest lookup
  const guestId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the guest record by ID
  const guest = await api.functional.todoApp.guests.at(guestConnection, {
    guestId,
  });
  // Validate complete response structure
  typia.assert(guest);
  // Verify business logic: active guest has null deleted_at
  TestValidator.equals(
    "active guest has null deleted_at",
    guest.deleted_at,
    null,
  );
}
