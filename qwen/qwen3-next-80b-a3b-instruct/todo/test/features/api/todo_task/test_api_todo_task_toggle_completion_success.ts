import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_task_toggle_completion_success(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user to establish identity
  const authResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection);
  typia.assert(authResponse);

  // Step 2: Create a new task with random title
  const task: ITodoListTask = await api.functional.todoList.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(task);

  // Step 3: Toggle task completion status from false to true
  const updatedTask: ITodoListTask =
    await api.functional.todoList.tasks.complete.toggleCompletion(connection, {
      taskId: task.id,
    });
  typia.assert(updatedTask);

  // Step 4: Validate the task was updated correctly
  TestValidator.equals(
    "task ID should remain unchanged",
    updatedTask.id,
    task.id,
  );
  TestValidator.equals(
    "task title should remain unchanged",
    updatedTask.title,
    task.title,
  );
  TestValidator.predicate(
    "task should be completed",
    updatedTask.completed === true,
  );
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(updatedTask.updated_at) > new Date(task.created_at),
  );
  TestValidator.notEquals(
    "updated_at should be different from created_at",
    updatedTask.updated_at,
    task.created_at,
  );
}
