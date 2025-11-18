import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test deleting a todo with a nonexistent UUID.
 *
 * This test validates that the API properly handles attempts to delete a todo
 * item that does not exist in the database. It ensures that the system
 * validates todo existence and ownership before performing soft deletion
 * operations.
 *
 * Test Workflow:
 *
 * 1. Create and authenticate a new user account
 * 2. Generate a valid UUID format that doesn't correspond to any existing todo
 * 3. Attempt to delete the nonexistent todo
 * 4. Verify that the operation fails with an appropriate error response
 */
export async function test_api_todo_delete_nonexistent_todo(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        ip: undefined,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Generate a valid UUID that doesn't exist in the database
  const nonexistentTodoId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to delete the nonexistent todo and verify it fails
  await TestValidator.error(
    "deleting nonexistent todo should fail",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: nonexistentTodoId,
      });
    },
  );
}
