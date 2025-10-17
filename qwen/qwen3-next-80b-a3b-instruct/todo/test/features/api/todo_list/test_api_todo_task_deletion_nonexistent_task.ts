import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_task_deletion_nonexistent_task(
  connection: api.IConnection,
) {
  // Step 1: First, authenticate the user to establish a valid session
  const user: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection);
  typia.assert(user);

  // Step 2: Generate a non-existent task UUID with proper format
  const nonExistentTaskId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Attempt to delete a non-existent task - should return 204 No Content without error
  // Verify that the idempotent delete operation succeeds without throwing HttpError
  await TestValidator.error(
    "deleting non-existent task should return 204 No Content without error",
    async () => {
      await api.functional.todoList.tasks.erase(connection, {
        taskId: nonExistentTaskId,
      });
    },
  );

  // Step 4: Verify idempotency by attempting the same deletion again
  // Confirm that subsequent attempts to delete the same non-existent task also return 204
  await TestValidator.error(
    "repeated deletion of non-existent task should remain idempotent with 204 No Content",
    async () => {
      await api.functional.todoList.tasks.erase(connection, {
        taskId: nonExistentTaskId,
      });
    },
  );
}
