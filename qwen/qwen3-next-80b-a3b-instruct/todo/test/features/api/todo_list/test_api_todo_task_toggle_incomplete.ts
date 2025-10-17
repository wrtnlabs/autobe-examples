import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";

export async function test_api_todo_task_toggle_incomplete(
  connection: api.IConnection,
) {
  // Create a new task with title - default status is incomplete (false)
  const task: ITodoListTask = await api.functional.todoList.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4, wordMax: 8 }),
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(task);

  // Verify the task was created as incomplete (default)
  TestValidator.equals(
    "task should be created as incomplete",
    task.completed,
    false,
  );

  // Toggle the task to complete (true) using the toggle endpoint
  const completedTask: ITodoListTask =
    await api.functional.todoList.tasks.complete.toggleCompletion(connection, {
      taskId: task.id,
    });
  typia.assert(completedTask);

  // Verify task status is now complete
  TestValidator.equals(
    "task should be marked as complete",
    completedTask.completed,
    true,
  );

  // Toggle the task back to incomplete (false) using the toggle endpoint
  const toggledTask: ITodoListTask =
    await api.functional.todoList.tasks.complete.toggleCompletion(connection, {
      taskId: completedTask.id,
    });
  typia.assert(toggledTask);

  // Verify completion status has been toggled back to false
  TestValidator.equals(
    "task completion status should be toggled to incomplete",
    toggledTask.completed,
    false,
  );

  // Verify all other properties remain unchanged
  TestValidator.equals(
    "task title should remain unchanged",
    toggledTask.title,
    completedTask.title,
  );
  TestValidator.equals(
    "task todo_list_user_id should remain unchanged",
    toggledTask.todo_list_user_id,
    completedTask.todo_list_user_id,
  );
  TestValidator.equals(
    "task created_at should remain unchanged",
    toggledTask.created_at,
    completedTask.created_at,
  );

  // Verify updated_at has changed (was updated during toggle)
  TestValidator.notEquals(
    "task updated_at should be updated after toggle",
    toggledTask.updated_at,
    completedTask.updated_at,
  );
}
