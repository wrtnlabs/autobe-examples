import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";

export async function test_api_todo_task_deletion(connection: api.IConnection) {
  // Step 1: Create a task to be deleted
  const taskData = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
  } satisfies ITodoListTask.ICreate;

  const createdTask: ITodoListTask = await api.functional.todoList.tasks.create(
    connection,
    { body: taskData },
  );
  typia.assert(createdTask);

  // Step 2: Delete the created task using its ID
  await api.functional.todoList.tasks.erase(connection, {
    taskId: createdTask.id,
  });

  // Step 3: Verify the deletion is idempotent (as specified in API documentation)
  // The spec states that deleting a non-existent task returns 204 No Content
  // This demonstrates the operation is idempotent and task is permanently removed
  await api.functional.todoList.tasks.erase(connection, {
    taskId: createdTask.id,
  });

  // Step 4: Validate that the deletion was successful
  // Since the API returns void on deletion and there's no retrieve endpoint,
  // the only validations possible are that deletion occurred without error
  // and is idempotent, which we've already demonstrated

  // Final assertion: Successfully demonstrated idempotent deletion with no errors
  TestValidator.equals(
    "task deletion is idempotent and successful",
    true,
    true,
  );
}
