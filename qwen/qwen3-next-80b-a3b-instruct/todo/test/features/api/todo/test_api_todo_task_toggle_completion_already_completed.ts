import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";

export async function test_api_todo_task_toggle_completion_already_completed(
  connection: api.IConnection,
) {
  // Create a new task
  const task: ITodoListTask = await api.functional.todoList.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(task);

  // First toggle to mark task as completed (true)
  const completedTask: ITodoListTask =
    await api.functional.todoList.tasks.complete.toggleCompletion(connection, {
      taskId: task.id,
    });
  typia.assert(completedTask);
  TestValidator.equals(
    "task should be completed after first toggle",
    completedTask.completed,
    true,
  );

  // Second toggle to mark task as incomplete (false)
  const incompleteTask: ITodoListTask =
    await api.functional.todoList.tasks.complete.toggleCompletion(connection, {
      taskId: task.id,
    });
  typia.assert(incompleteTask);
  TestValidator.equals(
    "task should be incomplete after second toggle",
    incompleteTask.completed,
    false,
  );

  // Validate that other properties remain unchanged
  TestValidator.equals(
    "task ID should remain the same",
    incompleteTask.id,
    task.id,
  );
  TestValidator.equals(
    "task title should remain unchanged",
    incompleteTask.title,
    task.title,
  );
  TestValidator.equals(
    "task user ID should remain unchanged",
    incompleteTask.todo_list_user_id,
    task.todo_list_user_id,
  );
  TestValidator.predicate(
    "created_at should not change",
    () => incompleteTask.created_at === task.created_at,
  );
  TestValidator.predicate(
    "updated_at should change after toggle",
    () => incompleteTask.updated_at !== task.updated_at,
  );
}
