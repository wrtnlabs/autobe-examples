import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test deletion of a todo task by its authenticated owner.
 *
 * This end-to-end test function validates the entire flow from user
 * registration, task creation, task deletion, and error handling when
 * attempting to delete a non-existent or already deleted task.
 *
 * Steps:
 *
 * 1. User joins the system to get authenticated
 * 2. The authenticated user creates a new todo task
 * 3. The user deletes the created todo task successfully
 * 4. The user attempts to delete the already deleted task to verify error handling
 *
 * The test asserts correct API responses and runtime validation of all entities
 * involved, ensuring compliance with ownership and data integrity rules.
 */
export async function test_api_todo_list_task_deletion_by_owner(
  connection: api.IConnection,
) {
  // Step 1: User joins and obtains authentication token
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "Pa$w0rd!"; // Secure password example

  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(authorizedUser);

  // Step 2: The authenticated user creates a todo task
  const taskDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const createdTask: ITodoListTask =
    await api.functional.todoList.user.todoListTasks.create(connection, {
      body: {
        description: taskDescription,
      } satisfies ITodoListTask.ICreate,
    });
  typia.assert(createdTask);

  // Assert ownership
  TestValidator.equals(
    "todo_list_user_id of created task matches authorized user",
    createdTask.todo_list_user_id,
    authorizedUser.id,
  );

  // Step 3: Delete the created todo task
  await api.functional.todoList.user.todoListTasks.erase(connection, {
    id: createdTask.id,
  });

  // Step 4: Attempt to delete the same task again - expect error
  await TestValidator.error(
    "deleting a non-existent or already deleted task should throw error",
    async () => {
      await api.functional.todoList.user.todoListTasks.erase(connection, {
        id: createdTask.id,
      });
    },
  );
}
