import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_todo_deletion_unauthenticated(
  connection: api.IConnection,
) {
  /**
   * Test that unauthenticated users cannot delete todos.
   *
   * The deletion endpoint requires valid authentication. When a deletion
   * request is made without proper authentication credentials (empty headers),
   * the server should reject the request with a 401 Unauthorized error. This
   * ensures that todo data is protected from unauthorized deletion.
   */

  // Create an unauthenticated connection by clearing headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Generate a random UUID for the todo to delete
  const todoId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to delete a todo without authentication
  // Should fail with 401 Unauthorized error
  await TestValidator.error(
    "unauthenticated user should not be able to delete todo",
    async () => {
      await api.functional.todoApp.user.todos.erase(unauthConn, {
        todoId: todoId,
      });
    },
  );
}
