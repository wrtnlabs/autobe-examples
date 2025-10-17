import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * End-to-End test for the Todo list application's task deletion by an
 * authenticated user.
 *
 * This test covers the following steps:
 *
 * 1. User registration and authentication via /auth/user/join.
 * 2. Creation of a new todo task with a valid non-empty description.
 * 3. Deletion of the created todo task by its ID.
 * 4. Validation that the task is deleted and no longer accessible.
 * 5. Verification of error handling when deleting an already deleted or
 *    non-existent task.
 *
 * Each API call response is validated with typia.assert to ensure schema
 * correctness. TestValidator functions provide detailed assertion checks for
 * correct business logic, proper error handling, and data consistency across
 * operations.
 *
 * This ensures robust, reliable API behavior, especially related to
 * authorization and task lifecycle.
 */
export async function test_api_todo_list_task_deletion_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. User registration and authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "Password123!";
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create a new todo task with valid non-empty description
  const createBody = {
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies ITodoListTask.ICreate;
  const createdTask: ITodoListTask =
    await api.functional.todoList.user.todoListTasks.create(connection, {
      body: createBody,
    });
  typia.assert(createdTask);
  TestValidator.equals(
    "created todo task description matches input",
    createdTask.description,
    createBody.description,
  );
  TestValidator.predicate(
    "created todo task id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdTask.id,
    ),
  );

  // 3. Delete the created todo task by its ID
  await api.functional.todoList.user.todoListTasks.erase(connection, {
    id: createdTask.id,
  });

  // 4. Attempt to delete the same task again, expect error (already deleted)
  await TestValidator.error(
    "deleting already deleted task should fail",
    async () => {
      await api.functional.todoList.user.todoListTasks.erase(connection, {
        id: createdTask.id,
      });
    },
  );

  // 5. Attempt to delete a non-existent random UUID task, expect error
  const randomId = typia.random<string & tags.Format<"uuid">>();

  // Ensure this randomId is different from createdTask.id
  TestValidator.notEquals(
    "random ID differs from created task ID",
    randomId,
    createdTask.id,
  );

  await TestValidator.error(
    "deleting non-existent task should fail",
    async () => {
      await api.functional.todoList.user.todoListTasks.erase(connection, {
        id: randomId,
      });
    },
  );
}
