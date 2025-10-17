import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_task_completion_toggle_from_incomplete(
  connection: api.IConnection,
) {
  // Step 1: Establish user context through authentication
  const user: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection);
  typia.assert(user);

  // Step 2: Create a task in incomplete state
  const taskTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const createdTask: ITodoListTask = await api.functional.todoList.tasks.create(
    connection,
    {
      body: {
        title: taskTitle,
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(createdTask);
  TestValidator.equals(
    "task is initially incomplete",
    createdTask.completed,
    false,
  );
  TestValidator.equals("task title preserved", createdTask.title, taskTitle);

  // Step 3: Toggle completion status from incomplete to complete
  const toggledTask: ITodoListTask =
    await api.functional.todoList.tasks.complete.toggleCompletion(connection, {
      taskId: createdTask.id,
    });
  typia.assert(toggledTask);

  // Step 4: Verify task was properly updated
  TestValidator.equals("task is now complete", toggledTask.completed, true);
  TestValidator.equals(
    "task title preserved after toggle",
    toggledTask.title,
    taskTitle,
  );
  TestValidator.equals("task id unchanged", toggledTask.id, createdTask.id);
  TestValidator.equals(
    "task user id unchanged",
    toggledTask.todo_list_user_id,
    createdTask.todo_list_user_id,
  );
  TestValidator.equals(
    "creation timestamp preserved",
    toggledTask.created_at,
    createdTask.created_at,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    toggledTask.updated_at,
    createdTask.updated_at,
  );
}
