import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Verify idempotent deletion of a todo item.
 *
 * Business context:
 *
 * - A newly registered user creates a todo item.
 * - The user requests deletion of the todo item.
 * - Deleting the same todo multiple times should be safe (idempotent).
 *
 * Steps:
 *
 * 1. Register a new user via POST /auth/user/join
 * 2. Create a todo via POST /todoApp/user/todos
 * 3. Call DELETE /todoApp/user/todos/{todoId} once and ensure it completes
 * 4. Call DELETE /todoApp/user/todos/{todoId} a second time and ensure it also
 *    completes (idempotent)
 *
 * Notes:
 *
 * - The SDK automatically sets Authorization header after join(), so the
 *   subsequent create/erase calls are authenticated implicitly.
 * - There is no GET /todoApp/user/todos/{id} function exposed in the SDK
 *   materials, so this test verifies idempotency by ensuring repeated erase
 *   calls complete without throwing errors.
 */
export async function test_api_todo_delete_idempotent(
  connection: api.IConnection,
) {
  // 1) Register a fresh user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppUser.ICreate;

  const auth: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(auth);

  // 2) Create a todo for the authenticated user
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    position: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    is_completed: false,
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(todo);

  // 3) First delete - should complete without throwing
  await api.functional.todoApp.user.todos.erase(connection, {
    todoId: todo.id,
  });
  // If we reached here, the first erase completed. Assert logically true.
  TestValidator.predicate("first delete completed without error", true);

  // 4) Second delete (idempotent) - should also complete without throwing
  await api.functional.todoApp.user.todos.erase(connection, {
    todoId: todo.id,
  });
  TestValidator.predicate(
    "second delete completed without error (idempotent)",
    true,
  );

  // Note: No GET-by-id endpoint was provided in the SDK materials, so we
  // cannot perform an explicit GET to assert 404. The idempotency is
  // validated by the ability to call erase() repeatedly without error.
}
