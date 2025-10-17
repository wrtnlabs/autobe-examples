import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validate Todo deletion success and idempotency.
 *
 * Business context:
 *
 * - A user registers in the system and creates a todo item.
 * - The user deletes the todo. The delete operation is idempotent by design
 *   (soft-delete semantics): calling DELETE on an already-deleted resource
 *   should succeed (204) and not raise an error.
 *
 * Test steps:
 *
 * 1. Register a fresh user via POST /auth/user/join
 * 2. Create a todo via POST /todoApp/user/todos
 * 3. Delete the todo via DELETE /todoApp/user/todos/{todoId}
 * 4. Call DELETE again with the same todoId to assert idempotency (no error)
 *
 * Notes:
 *
 * - The SDK does not provide a GET operation for a single todo; therefore the
 *   test verifies idempotency by re-invoking DELETE and asserting no exception
 *   is thrown. All assertions rely on typia.assert for DTO validation and
 *   TestValidator for business assertions.
 */
export async function test_api_todo_delete_success_and_idempotent(
  connection: api.IConnection,
) {
  // 1) Register a new user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "Password123!",
        display_name: RandomGenerator.name(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  // Validate the authorization response and ensure token is set
  typia.assert(user);

  // 2) Create a new todo for the authenticated user
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 16,
      wordMin: 3,
      wordMax: 8,
    }),
    position: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >(),
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(todo);

  // Basic sanity checks (business-level)
  TestValidator.predicate(
    "todo id exists",
    typeof todo.id === "string" && todo.id.length > 0,
  );
  TestValidator.predicate(
    "todo has created_at",
    typeof todo.created_at === "string" && todo.created_at.length > 0,
  );

  // 3) Delete the todo (first attempt) - should succeed (no exception)
  await api.functional.todoApp.user.todos.erase(connection, {
    todoId: todo.id,
  });

  // 4) Delete the todo again to assert idempotency (second attempt)
  // If the endpoint is implemented as idempotent soft-delete, this call
  // should also succeed (no exception thrown). The SDK maps a 2xx/204 to
  // a void return; therefore successful resolution implies idempotent
  // behavior as documented.
  await api.functional.todoApp.user.todos.erase(connection, {
    todoId: todo.id,
  });

  // If we reached this point without exceptions, treat as a passing idempotency assertion.
  TestValidator.predicate(
    "delete operation is idempotent (no error on repeated delete)",
    true,
  );
}
