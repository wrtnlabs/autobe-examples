import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_retrieval_non_existent(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not correspond to any existing guest
  const nonExistentGuestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to retrieve the non-existent guest and expect a 404 Not Found error
  await TestValidator.httpError(
    "retrieve non-existent guest",
    404,
    async () => {
      await api.functional.multiUserTodo.guests.at(connection, {
        guestId: nonExistentGuestId,
      });
    },
  );
}
