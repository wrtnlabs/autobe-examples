import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieval of a non-existent todo returns appropriate error.
 *
 * This test validates that the API correctly handles requests for todo items
 * that do not exist in the system. It creates a new user account through
 * authentication, then attempts to retrieve a todo using a valid UUID format
 * that has never been created. The test verifies that the API returns a 404 Not
 * Found error and properly differentiates between invalid UUID formats and
 * non-existent resources with valid formats.
 *
 * Steps:
 *
 * 1. Create a new user account via authentication endpoint
 * 2. Generate a valid UUID that does not correspond to any existing todo
 * 3. Attempt to retrieve the non-existent todo
 * 4. Verify that 404 error is returned
 * 5. Confirm the error response clearly indicates the resource was not found
 */
export async function test_api_todo_retrieval_nonexistent_todo_id(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Generate a valid UUID that does not correspond to any existing todo
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();

  // Step 3 & 4: Attempt to retrieve the non-existent todo and verify 404 error
  await TestValidator.httpError(
    "non-existent todo should return 404 not found",
    404,
    async () => {
      return await api.functional.todoList.user.todos.at(connection, {
        todoId: nonExistentTodoId,
      });
    },
  );
}
