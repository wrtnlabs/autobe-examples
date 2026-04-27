import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_retrieve_non_existent_returns_404(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that was never created in the system
  const randomGuestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Call the endpoint with the non-existent UUID; expect HTTP 404 Not Found
  await TestValidator.httpError(
    "retrieve non-existent guest returns 404",
    404,
    () =>
      api.functional.todoApp.guests.at(connection, { guestId: randomGuestId }),
  );
}
