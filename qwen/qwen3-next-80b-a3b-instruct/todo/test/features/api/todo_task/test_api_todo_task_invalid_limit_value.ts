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
 * Test that the system rejects invalid limit values outside the allowed range
 * (1-100).
 *
 * This test validates proper input validation for pagination limits in the todo
 * task API. The system should reject limit values that are 0, negative, or
 * exceed 100 with a 400 error.
 *
 * The workflow:
 *
 * 1. Authenticate a user to establish context for task operations
 * 2. Test invalid limit values: 0, -1, 101
 * 3. Each invalid limit should trigger a 400 error with appropriate validation
 *    message
 * 4. Verify proper system behavior for boundary condition validation
 */
export async function test_api_todo_task_invalid_limit_value(
  connection: api.IConnection,
) {
  // 1. Authenticate user
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // 2. Test invalid limit values
  // Test with limit = 0
  await TestValidator.error(
    "limit value of 0 should fail validation",
    async () => {
      await api.functional.todoList.user.tasks.index(connection, {
        body: JSON.stringify({ limit: 0 }) satisfies ITodoListTask.IRequest,
      });
    },
  );

  // Test with limit = -1
  await TestValidator.error(
    "negative limit value (-1) should fail validation",
    async () => {
      await api.functional.todoList.user.tasks.index(connection, {
        body: JSON.stringify({ limit: -1 }) satisfies ITodoListTask.IRequest,
      });
    },
  );

  // Test with limit = 101
  await TestValidator.error(
    "limit value of 101 should fail validation",
    async () => {
      await api.functional.todoList.user.tasks.index(connection, {
        body: JSON.stringify({ limit: 101 }) satisfies ITodoListTask.IRequest,
      });
    },
  );
}
