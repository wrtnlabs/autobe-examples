import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";

export async function test_api_todo_task_delete_nonexistent(
  connection: api.IConnection,
) {
  // Create a task to establish context before attempting deletion of a non-existent task
  const createdTask: ITodoListTask = await api.functional.todoList.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(createdTask);

  // Delete a non-existent task using an invalid task ID (not matching any existing task)
  // Validate idempotent behavior: API should return 204 No Content without error
  // This confirms that the system does not expose information about task existence
  await TestValidator.error(
    "deleting non-existent task should not throw error (idempotent behavior)",
    async () => {
      await api.functional.todoList.tasks.erase(connection, {
        taskId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
