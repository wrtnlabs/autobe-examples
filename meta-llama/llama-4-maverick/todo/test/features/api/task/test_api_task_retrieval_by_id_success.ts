import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";

export async function test_api_task_retrieval_by_id_success(
  connection: api.IConnection,
) {
  const taskId = typia.random<string & tags.Format<"uuid">>();
  const task: ITodoListTask = await api.functional.todoList.tasks.at(
    connection,
    { taskId },
  );
  typia.assert(task);
  TestValidator.equals("task ID matches", task, taskId);
}
