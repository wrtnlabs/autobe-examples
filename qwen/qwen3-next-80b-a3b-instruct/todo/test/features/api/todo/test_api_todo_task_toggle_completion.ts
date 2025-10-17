import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";

export async function test_api_todo_task_toggle_completion(
  connection: api.IConnection,
) {
  // Step 1: Create a new task with a random title
  const task: ITodoListTask = await api.functional.todoList.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(task);

  // Step 2: Verify initial completion status is false (incomplete)
  TestValidator.equals(
    "initial task should be incomplete",
    task.completed,
    false,
  );

  // Step 3: Toggle the task completion status
  const updatedTask: ITodoListTask =
    await api.functional.todoList.tasks.complete.toggleCompletion(connection, {
      taskId: task.id,
    });
  typia.assert(updatedTask);

  // Step 4: Verify the task completion status was toggled to true
  TestValidator.equals(
    "task completion status should be toggled to true",
    updatedTask.completed,
    true,
  );

  // Step 5: Verify other properties (title, id, created_at, updated_at) remain unchanged
  TestValidator.equals(
    "task title should remain unchanged",
    updatedTask.title,
    task.title,
  );
  TestValidator.equals(
    "task id should remain unchanged",
    updatedTask.id,
    task.id,
  );
  TestValidator.equals(
    "task created_at should remain unchanged",
    updatedTask.created_at,
    task.created_at,
  );

  // Note: updated_at will change, which is expected behavior - this is confirmed by the API specification
}
