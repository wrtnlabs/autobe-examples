import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_task_creation_with_valid_title(
  connection: api.IConnection,
) {
  // Step 1: Establish user context through authentication
  const user: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection);
  typia.assert(user);

  // Step 2: Create a new todo task with valid title (1-500 characters)
  const title = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 10,
  });

  const task: ITodoListTask = await api.functional.todoList.tasks.create(
    connection,
    {
      body: {
        title,
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(task);

  // Step 3: Validate task properties
  TestValidator.equals("task title matches input", task.title, title);
  TestValidator.predicate("task is not completed", !task.completed);
  TestValidator.predicate(
    "task has a valid UUID",
    /^[0-9a-f-]{36}$/i.test(task.id),
  );
  TestValidator.predicate(
    "task has a valid creation timestamp",
    new Date(task.created_at) instanceof Date,
  );
  TestValidator.predicate(
    "task has a valid updated timestamp",
    new Date(task.updated_at) instanceof Date,
  );
}
