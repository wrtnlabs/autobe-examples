import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";

export async function test_api_task_deletion(connection: api.IConnection) {
  // Step 1: Create a task to be deleted
  const createdTask: ITodoListTask = await api.functional.todoList.tasks.create(
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
  typia.assert(createdTask);

  // Step 2: Delete the created task
  await api.functional.todoList.tasks.erase(connection, {
    taskId: createdTask.id,
  });

  // Note: The API does not provide a way to retrieve individual tasks or toggle them,
  // so we cannot validate that the task is gone (404 responses). We can only verify
  // that the delete operation completes successfully without error.
  // This implementation adheres to the provided API, which has only create and delete endpoints.
}
