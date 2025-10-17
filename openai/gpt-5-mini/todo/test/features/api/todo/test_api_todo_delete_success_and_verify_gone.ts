import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * E2E: Delete a todo (soft-delete) and verify it is effectively removed by
 * verifying idempotent delete behavior.
 *
 * Business context:
 *
 * - A user must register (join) and authenticate before creating or deleting
 *   todos. The SDK's auth.user.join call populates the connection's
 *   Authorization header for subsequent owner-scoped operations.
 * - The server implements soft-delete semantics (deleted_at). The provided SDK
 *   contains no GET-by-id accessor, therefore the test verifies deletion by
 *   asserting the first erase succeeds and that a second erase for the same id
 *   does not throw (idempotency), which aligns with the documented behavior for
 *   soft-deletes and idempotent delete operations.
 *
 * Steps:
 *
 * 1. Register a fresh user using api.functional.auth.user.join.
 * 2. Create a new todo via api.functional.todoApp.user.todos.create.
 * 3. Erase the created todo via api.functional.todoApp.user.todos.erase.
 * 4. Attempt to erase the same todo again and assert no error (idempotency).
 */
export async function test_api_todo_delete_success_and_verify_gone(
  connection: api.IConnection,
) {
  // 1) Register a fresh user (join)
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123", // meets MinLength<8>
        display_name: RandomGenerator.name(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // 2) Create a todo owned by the authenticated user
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    position: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: createBody,
    },
  );
  // Validate returned todo shape
  typia.assert(todo);

  // Basic sanity checks on returned values (business-level assertions)
  TestValidator.predicate("created todo has id", typeof todo.id === "string");
  TestValidator.predicate(
    "created todo belongs to authenticated user",
    todo.user_id === user.id,
  );

  // 3) Erase the todo (first delete) - expect success (no exception)
  await api.functional.todoApp.user.todos.erase(connection, {
    todoId: todo.id,
  });
  // If no exception was thrown above, erase was successful (server likely returned 204)
  TestValidator.predicate("first erase completed without error", true);

  // 4) Erase the same todo again to verify idempotency (should not throw)
  let secondDeleteThrew = false;
  try {
    await api.functional.todoApp.user.todos.erase(connection, {
      todoId: todo.id,
    });
  } catch (exp) {
    secondDeleteThrew = true;
  }
  TestValidator.predicate(
    "second erase is idempotent (no error on repeated delete)",
    secondDeleteThrew === false,
  );
}
