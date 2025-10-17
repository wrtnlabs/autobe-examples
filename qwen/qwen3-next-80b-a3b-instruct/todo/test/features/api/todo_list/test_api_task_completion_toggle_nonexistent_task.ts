import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";

export async function test_api_task_completion_toggle_nonexistent_task(
  connection: api.IConnection,
) {
  // Generate a random UUID that doesn't exist in the system
  const nonexistentTaskId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to toggle completion status on a non-existent task
  await TestValidator.httpError(
    "toggle completion on nonexistent task should fail with 404",
    404,
    async () => {
      await api.functional.todoList.tasks.complete.toggleCompletion(
        connection,
        {
          taskId: nonexistentTaskId,
        },
      );
    },
  );
}
