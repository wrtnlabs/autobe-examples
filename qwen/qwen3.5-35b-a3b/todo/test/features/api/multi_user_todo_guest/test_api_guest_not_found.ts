import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for guest lookup
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID that does not exist in the system
  const nonExistentGuestId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent guest
  // This should return a 404 error indicating the guest was not found
  await TestValidator.httpError(
    "non-existent guest returns 404",
    404,
    async () => {
      await api.functional.multiUserTodo.guests.at(adminConnection, {
        guestId: nonExistentGuestId,
      });
    },
  );
  // Verify that no guest data is exposed for non-existent guests
  // The error response should only contain error information,
  // not guest data like fingerprint_hash, user_agent, etc.
  const anotherNonExistentGuestId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "another non-existent guest returns 404",
    404,
    async () => {
      await api.functional.multiUserTodo.guests.at(adminConnection, {
        guestId: anotherNonExistentGuestId,
      });
    },
  );
}
