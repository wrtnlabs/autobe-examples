import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";

/**
 * Verify that unauthenticated access to Todo detail is denied.
 *
 * Business context:
 *
 * - The Todo detail endpoint is restricted to authenticated todoMember actors.
 * - Authentication must be enforced before ownership or existence checks.
 *
 * Steps:
 *
 * 1. Build an unauthenticated connection by cloning the given connection and
 *    assigning empty headers.
 * 2. Generate a random UUID for the path parameter todoId.
 * 3. Invoke GET /todoList/todoMember/todos/{todoId} without auth and expect an
 *    error.
 *
 *    - Do NOT assert specific HTTP status codes (401/403); only assert that an error
 *         occurs.
 */
export async function test_api_todo_detail_requires_auth(
  connection: api.IConnection,
) {
  // 1) Prepare an unauthenticated connection (do not touch headers after creation)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Generate a UUID-like todoId
  const todoId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3) Expect error due to missing authentication
  await TestValidator.error(
    "unauthenticated user cannot access todo detail",
    async () => {
      await api.functional.todoList.todoMember.todos.at(unauthConn, {
        todoId,
      });
    },
  );
}
