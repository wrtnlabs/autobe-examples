import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListTaskArray } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTaskArray";

export async function test_api_task_list_retrieval_empty(
  connection: api.IConnection,
) {
  const tasks: ITodoListTaskArray =
    await api.functional.todoList.tasks.index(connection);
  typia.assert(tasks);
  TestValidator.equals("empty task list should return empty array", tasks, []);
}
