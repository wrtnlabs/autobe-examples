import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListTaskArray } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTaskArray";

export async function test_api_todo_tasks_retrieval_empty_list(
  connection: api.IConnection,
) {
  const output: ITodoListTaskArray =
    await api.functional.todoList.tasks.index(connection);
  typia.assert(output);
  TestValidator.equals("tasks array should be empty", output, []);
}
