import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_task_completion_toggle_from_incomplete_to_complete(
  connection: api.IConnection,
) {
  // 1. Establish user context by joining
  const authResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection);
  typia.assert(authResponse);

  // 2. Create a new task with completion status set to false
  const taskTitle = RandomGenerator.paragraph({ sentences: 3 });
  const createdTask: ITodoListTask = await api.functional.todoList.tasks.create(
    connection,
    {
      body: {
        title: taskTitle,
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(createdTask);

  // Verify initial state: task is incomplete
  TestValidator.equals(
    "initial task should be incomplete",
    createdTask.completed,
    false,
  );
  TestValidator.equals("task title should match", createdTask.title, taskTitle);

  // 3. Toggle completion status from incomplete to complete
  const toggledTask: ITodoListTask =
    await api.functional.todoList.tasks.complete.toggleCompletion(connection, {
      taskId: createdTask.id,
    });
  typia.assert(toggledTask);

  // 4. Validate the toggled task
  TestValidator.equals(
    "task id should be preserved",
    toggledTask.id,
    createdTask.id,
  );
  TestValidator.equals(
    "task title should be preserved",
    toggledTask.title,
    taskTitle,
  );
  TestValidator.equals(
    "task should now be completed",
    toggledTask.completed,
    true,
  );
  TestValidator.notEquals(
    "updated_at should be modified",
    toggledTask.updated_at,
    createdTask.updated_at,
  );
  TestValidator.equals(
    "todo_list_user_id should be preserved",
    toggledTask.todo_list_user_id,
    authResponse.id,
  );
}
