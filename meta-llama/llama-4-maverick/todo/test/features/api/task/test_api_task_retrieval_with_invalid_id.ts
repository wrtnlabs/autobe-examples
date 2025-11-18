import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";

export async function test_api_task_retrieval_with_invalid_id(
  connection: api.IConnection,
) {
  // Generate a random, non-existent task ID
  const nonExistentTaskId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve the task using the invalid ID
  await TestValidator.error(
    "Retrieving task with non-existent ID should fail",
    async () => {
      await api.functional.todoList.tasks.at(connection, {
        taskId: nonExistentTaskId,
      });
    },
  );
}
