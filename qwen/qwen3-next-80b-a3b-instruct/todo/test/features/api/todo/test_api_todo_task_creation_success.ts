import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_task_creation_success(
  connection: api.IConnection,
) {
  // 1. Authenticate user to establish identity
  const authResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection);
  typia.assert(authResponse);

  // 2. Create new todo task with valid title
  const taskTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 10,
  });
  const task: ITodoListTask = await api.functional.todoList.tasks.create(
    connection,
    {
      body: {
        title: taskTitle,
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(task);

  // 3. Validate business logic properties
  TestValidator.equals("task title matches", task.title, taskTitle);
  TestValidator.equals(
    "task belongs to authenticated user",
    task.todo_list_user_id,
    authResponse.id,
  );
  TestValidator.equals("task completed is false", task.completed, false);
}
