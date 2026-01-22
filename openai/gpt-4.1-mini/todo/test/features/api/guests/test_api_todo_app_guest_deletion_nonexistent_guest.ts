import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
export async function test_api_todo_app_guest_deletion_nonexistent_guest(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate valid random UUID for a guestId that does not exist
  const nonExistentGuestId = typia.random<string & tags.Format<"uuid">>();
  // 2. Attempt to delete the guest with the non-existent ID, expecting an error
  await TestValidator.error(
    "delete non-existent guest should fail",
    async () => {
      await api.functional.todoApp.guests.erase(connection, {
        guestId: nonExistentGuestId,
      });
    },
  );
}
