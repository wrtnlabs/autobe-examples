import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test retrieval attempt for a todo item that does not exist.
 *
 * This test validates that the system returns appropriate error handling when
 * attempting to retrieve a todo with an invalid or non-existent UUID. The test
 * creates an authenticated user context through the join operation, then
 * attempts to retrieve a todo using a randomly generated UUID that does not
 * exist in the system. The main validation ensures that the API call properly
 * fails with an error response when the requested resource is not found.
 */
export async function test_api_todo_retrieval_nonexistent_id(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      password_hash: typia.random<string>(),
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: undefined,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Generate a random UUID that does not exist in the system
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to retrieve a todo item with the non-existent UUID
  // This should fail since the todo does not exist
  await TestValidator.error(
    "retrieving non-existent todo should fail",
    async () => {
      await api.functional.todoApp.user.todos.at(connection, {
        todoId: nonExistentTodoId,
      });
    },
  );
}
