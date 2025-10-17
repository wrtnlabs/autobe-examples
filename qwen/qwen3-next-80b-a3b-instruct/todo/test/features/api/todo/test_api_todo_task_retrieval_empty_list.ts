import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListTaskArray } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTaskArray";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_task_retrieval_empty_list(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user to establish context for todo list operations
  const user: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection);
  typia.assert(user);

  // Step 2: Retrieve all todo tasks (should be empty for a new user)
  const tasks: ITodoListTaskArray =
    await api.functional.todoList.tasks.index(connection);
  typia.assert(tasks);

  // Step 3: Validate response is an empty array
  TestValidator.equals("task list should be empty", tasks.length, 0);
}
