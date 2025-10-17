import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_task_deletion_with_valid_id(
  connection: api.IConnection,
) {
  // Step 1: Establish user context by joining
  const authResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection);
  typia.assert(authResponse);

  // Step 2: Create a task to delete
  const taskTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
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

  // Step 3: Delete the task using its valid ID
  // Verify the delete operation successfully returns 204 No Content
  await TestValidator.httpError(
    "delete operation should return 204 No Content",
    204,
    async () => {
      await api.functional.todoList.tasks.erase(connection, {
        taskId: createdTask.id,
      });
    },
  );

  // Step 4: Verify the delete operation is idempotent - try deleting same task again
  // The system should still return 204 even if the task is already deleted
  await TestValidator.httpError(
    "delete operation should be idempotent (return 204 on already deleted task)",
    204,
    async () => {
      await api.functional.todoList.tasks.erase(connection, {
        taskId: createdTask.id,
      });
    },
  );

  // Step 5: Create another task to confirm system is still fully operational
  // This verifies that the deletion didn't affect other operations
  const secondTaskTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 7,
  });
  const secondTask: ITodoListTask = await api.functional.todoList.tasks.create(
    connection,
    {
      body: {
        title: secondTaskTitle,
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(secondTask);
  TestValidator.notEquals(
    "second task should have different ID from first task",
    secondTask.id,
    createdTask.id,
  );
}
