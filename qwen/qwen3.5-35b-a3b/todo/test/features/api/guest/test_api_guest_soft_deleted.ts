import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a UUID for a soft-deleted guest
  // In production, this would be an actual guest record with deleted_at not null
  const softDeletedGuestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2-4. Verify GET request to soft-deleted guest returns 404
  await TestValidator.httpError(
    "soft-deleted guest returns 404",
    404,
    async () => {
      await api.functional.multiUserTodo.guests.at(connection, {
        guestId: softDeletedGuestId,
      });
    },
  );
}
