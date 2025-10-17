import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";

export async function test_api_todo_task_toggle_complete(
  connection: api.IConnection,
) {
  // Create a task to toggle its completion status
  const createdTask: ITodoListTask = await api.functional.todoList.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 10,
        }),
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(createdTask);

  // Toggle the completion status from incomplete to complete
  const toggledTask: ITodoListTask =
    await api.functional.todoList.tasks.complete.toggleCompletion(connection, {
      taskId: createdTask.id,
    });
  typia.assert(toggledTask);

  // Validate that the task ID matches the original task
  TestValidator.equals("task ID matches", toggledTask.id, createdTask.id);

  // Validate that the completion status was toggled to true (completed)
  TestValidator.equals("task completed status", toggledTask.completed, true);

  // Validate that the title remains unchanged
  TestValidator.equals(
    "task title unchanged",
    toggledTask.title,
    createdTask.title,
  );

  // Validate that timestamps were updated (created_at unchanged, updated_at changed)
  TestValidator.equals(
    "created_at unchanged",
    toggledTask.created_at,
    createdTask.created_at,
  );
  TestValidator.notEquals(
    "updated_at changed",
    toggledTask.updated_at,
    createdTask.updated_at,
  );

  // Toggle the completion status again (from complete back to incomplete)
  const toggledAgainTask: ITodoListTask =
    await api.functional.todoList.tasks.complete.toggleCompletion(connection, {
      taskId: createdTask.id,
    });
  typia.assert(toggledAgainTask);

  // Validate that the task ID matches the original task
  TestValidator.equals(
    "task ID matches after second toggle",
    toggledAgainTask.id,
    createdTask.id,
  );

  // Validate that the completion status was toggled to false (incomplete)
  TestValidator.equals(
    "task completed status after second toggle",
    toggledAgainTask.completed,
    false,
  );

  // Validate that the title remains unchanged
  TestValidator.equals(
    "task title unchanged after second toggle",
    toggledAgainTask.title,
    createdTask.title,
  );

  // Validate that updated_at changed again
  TestValidator.notEquals(
    "updated_at changed after second toggle",
    toggledAgainTask.updated_at,
    toggledTask.updated_at,
  );
}
