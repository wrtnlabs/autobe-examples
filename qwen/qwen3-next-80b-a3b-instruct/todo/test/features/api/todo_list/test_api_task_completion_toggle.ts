import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";

export async function test_api_task_completion_toggle(
  connection: api.IConnection,
) {
  // Create a new task
  const task: ITodoListTask = await api.functional.todoList.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(task);

  // Validate initial state: task is not completed
  TestValidator.equals(
    "initial task should not be completed",
    task.completed,
    false,
  );
  const initialCreatedAt = task.created_at;
  const initialUpdatedAt = task.updated_at;

  // Toggle completion status to true
  const toggledTask: ITodoListTask =
    await api.functional.todoList.tasks.complete.toggleCompletion(connection, {
      taskId: task.id,
    });
  typia.assert(toggledTask);

  // Validate toggled state: task is now completed
  TestValidator.equals(
    "task should be completed after toggle",
    toggledTask.completed,
    true,
  );
  TestValidator.notEquals(
    "updated_at should change after toggle",
    toggledTask.updated_at,
    initialUpdatedAt,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    toggledTask.created_at,
    initialCreatedAt,
  );

  // Toggle completion status back to false
  const toggledBackTask: ITodoListTask =
    await api.functional.todoList.tasks.complete.toggleCompletion(connection, {
      taskId: task.id,
    });
  typia.assert(toggledBackTask);

  // Validate reverted state: task is now incomplete again
  TestValidator.equals(
    "task should be incomplete after second toggle",
    toggledBackTask.completed,
    false,
  );
  TestValidator.notEquals(
    "updated_at should change after second toggle",
    toggledBackTask.updated_at,
    toggledTask.updated_at,
  );
  TestValidator.equals(
    "created_at should remain unchanged after second toggle",
    toggledBackTask.created_at,
    initialCreatedAt,
  );
  TestValidator.equals(
    "title should remain unchanged",
    toggledBackTask.title,
    task.title,
  );

  // Final validation: ensure the task can be toggled again
  const toggledAgainTask: ITodoListTask =
    await api.functional.todoList.tasks.complete.toggleCompletion(connection, {
      taskId: task.id,
    });
  typia.assert(toggledAgainTask);

  TestValidator.equals(
    "task should be completed after third toggle",
    toggledAgainTask.completed,
    true,
  );
  TestValidator.notEquals(
    "update timestamp should change",
    toggledAgainTask.updated_at,
    toggledBackTask.updated_at,
  );
}
