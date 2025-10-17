import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_task_toggle_completion_nonexistent_task(
  connection: api.IConnection,
) {
  // Authenticate user to establish context for task operations
  await api.functional.auth.user.join(connection);

  // Generate a valid UUID format for a non-existent task ID
  const nonExistentTaskId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Validate that toggling completion on a non-existent task returns HTTP 404 Not Found
  await TestValidator.httpError(
    "toggle completion on non-existent task should return 404",
    404,
    async () => {
      await api.functional.todoList.tasks.complete.toggleCompletion(
        connection,
        {
          taskId: nonExistentTaskId,
        },
      );
    },
  );
}
