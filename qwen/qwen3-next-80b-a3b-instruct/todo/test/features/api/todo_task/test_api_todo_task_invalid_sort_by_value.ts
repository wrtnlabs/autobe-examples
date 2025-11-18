import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTask";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that the system rejects invalid sortBy values for task sorting.
 *
 * This test ensures proper input validation for the /todoList/user/tasks
 * endpoint. The system must reject sortBy values that are not one of the
 * allowed options: 'created_at', 'updated_at', or 'description'. When invalid
 * values are provided (e.g., 'name' or 'status'), the API should return a 400
 * error with a clear message indicating the acceptable values.
 *
 * The test workflow:
 *
 * 1. Authenticate a new user
 * 2. Attempt to sort tasks with invalid sortBy values ('name' and 'status')
 * 3. Verify that the system returns a 400 error with appropriate error message
 * 4. Confirm the error message clearly lists the accepted values
 */
export async function test_api_todo_task_invalid_sort_by_value(
  connection: api.IConnection,
) {
  // Step 1: Authenticate a new user to establish context
  const newUserEmail = typia.random<string & tags.Format<"email">>();
  const newUser = await api.functional.auth.user.join(connection, {
    body: {
      email: newUserEmail,
      password: "SecurePassword123!",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(newUser);

  // Step 2: Test invalid sortBy values - 'name'
  await TestValidator.error(
    "invalid sortBy 'name' should return 400 error",
    async () => {
      await api.functional.todoList.user.tasks.index(connection, {
        body: "name" satisfies ITodoListTask.IRequest,
      });
    },
  );

  // Step 3: Test invalid sortBy values - 'status'
  await TestValidator.error(
    "invalid sortBy 'status' should return 400 error",
    async () => {
      await api.functional.todoList.user.tasks.index(connection, {
        body: "status" satisfies ITodoListTask.IRequest,
      });
    },
  );
}
