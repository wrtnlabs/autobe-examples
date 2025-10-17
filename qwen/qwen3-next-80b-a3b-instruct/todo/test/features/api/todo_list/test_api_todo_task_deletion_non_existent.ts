import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_task_deletion_non_existent(
  connection: api.IConnection,
) {
  // Establish user context through authentication
  const user: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection);
  typia.assert(user);

  // Generate a random non-existent task ID
  const nonExistentTaskId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Attempt to delete a non-existent task - should succeed with 204 No Content
  await api.functional.todoList.tasks.erase(connection, {
    taskId: nonExistentTaskId,
  });
}
