import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListTaskArray } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTaskArray";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_tasks_retrieval_empty(
  connection: api.IConnection,
) {
  // Establish user context through authentication
  const authResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection);
  typia.assert(authResponse);

  // Retrieve all todo tasks when no tasks exist
  const taskList: ITodoListTaskArray =
    await api.functional.todoList.tasks.index(connection);
  typia.assert(taskList);

  // Verify the response is an empty array
  TestValidator.equals(
    "empty task list should be returned",
    taskList.length,
    0,
  );
}
