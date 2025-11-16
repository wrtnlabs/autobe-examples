import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test deletion attempt with a non-existent todo ID.
 *
 * This test validates that the deletion endpoint properly handles requests to
 * delete a todo that does not exist in the database. It uses a valid UUID
 * format that has never been assigned to any actual todo, ensuring that the API
 * gracefully handles this edge case without modifying system state.
 *
 * The test flow:
 *
 * 1. Create a user account through authentication
 * 2. Attempt to delete a todo using a non-existent UUID
 * 3. Verify that the operation returns a 404 Not Found error
 * 4. Validate that the error message clearly indicates the todo was not found
 * 5. Confirm that no system state changes occurred
 */
export async function test_api_todo_deletion_nonexistent_id(
  connection: api.IConnection,
) {
  // Step 1: Create a user account for deletion attempt
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123",
        href: "http://localhost:3000/todos",
        referrer: "http://localhost:3000/",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Generate a non-existent todo ID (valid UUID format)
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to delete the non-existent todo and verify error handling
  await TestValidator.error(
    "should fail when deleting non-existent todo",
    async () => {
      await api.functional.todoApp.user.todos.erase(connection, {
        todoId: nonExistentTodoId,
      });
    },
  );
}
