import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the deletion of a todo task by its unique ID for an authenticated user.
 *
 * The test includes creating a task first, then deleting it by ID. Validate
 * that only the authenticated owner can delete the task, the task is removed
 * from the system, and appropriate errors are returned if the task does not
 * exist or user is unauthorized.
 *
 * The test workflow is as follows:
 *
 * 1. Register a new user by calling the user join endpoint.
 * 2. Create a todo task with a non-empty description as the authenticated user.
 * 3. Delete the created todo task by its ID and verify successful deletion.
 * 4. Attempt to delete the same task again and verify error is returned indicating
 *    the task does not exist.
 * 5. Register a second user and attempt to delete the original task's ID (which
 *    does not exist anymore) to verify unauthorized access or error response.
 * 6. Attempt to delete a completely random non-existent todo task ID and assert
 *    error handling.
 *
 * All API responses should be type-asserted with typia.assert. Use
 * TestValidator to verify expected outcomes, including success and error cases.
 * Ensure authentication tokens are managed automatically by the API client. Use
 * realistic data generation for user email and task description using
 * typia.random and RandomGenerator.
 */
export async function test_api_todo_task_deletion_by_id_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail1: string = typia.random<string & tags.Format<"email">>();
  const user1: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail1,
        password: "P@ssw0rd123",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user1);

  // 2. Create a todo task with a non-empty description
  const taskDescription1 = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const todoTask1: ITodoListTask =
    await api.functional.todoList.user.todoListTasks.create(connection, {
      body: {
        description: taskDescription1,
      } satisfies ITodoListTask.ICreate,
    });
  typia.assert(todoTask1);

  // 3. Delete the created todo task by its ID
  await api.functional.todoList.user.todoListTasks.erase(connection, {
    id: todoTask1.id,
  });

  // 4. Attempt to delete the same task again and expect an error
  await TestValidator.error(
    "deleting an already deleted task should fail",
    async () => {
      await api.functional.todoList.user.todoListTasks.erase(connection, {
        id: todoTask1.id,
      });
    },
  );

  // 5. Register a second user
  const userEmail2: string = typia.random<string & tags.Format<"email">>();
  const user2: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail2,
        password: "P@ssw0rd456",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user2);

  // Try to delete the original task's ID with the second user
  await TestValidator.error(
    "second user cannot delete first user's task (already deleted)",
    async () => {
      await api.functional.todoList.user.todoListTasks.erase(connection, {
        id: todoTask1.id,
      });
    },
  );

  // 6. Attempt to delete a completely random non-existent todo task ID
  const randomNonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent task ID should fail",
    async () => {
      await api.functional.todoList.user.todoListTasks.erase(connection, {
        id: randomNonExistentId,
      });
    },
  );
}
