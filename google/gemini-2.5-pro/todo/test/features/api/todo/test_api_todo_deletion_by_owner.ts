import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate that a user can successfully delete their own todo item.
 *
 * 1. Register a new user for ownership context via /auth/user/join, capturing the
 *    resulting user information.
 * 2. As this user, create a new todo item via POST /todo/user/todos, capturing the
 *    returned todo id.
 * 3. Issue DELETE /todo/user/todos/{todoId} using the same authentication to
 *    delete the todo.
 * 4. Confirm the DELETE succeeds (does not throw). Optionally, attempt a re-DELETE
 *    to confirm it fails (demonstrates irreversibility).
 * 5. (If GET by ID exists) Confirm the todo is no longer retrievable; otherwise,
 *    this step is omitted due to unavailable API.
 *
 * The intent is to fully verify that deletion is possible only by the owner
 * and, once deleted, the todo is irreversibly removed.
 */
export async function test_api_todo_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a user to provide authentication and ownership context
  const joinBody = {
    email: typia.random<
      string & tags.MinLength<3> & tags.MaxLength<256> & tags.Format<"email">
    >(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    href: "https://localhost/register",
    referrer: "https://localhost/login",
  } satisfies ITodoUser.ICreate;
  const user: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBody },
  );
  typia.assert(user);
  // (SDK updates connection.headers.Authorization automatically)

  // 2. As this user, create a todo item
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "incomplete",
  } satisfies ITodoTodo.ICreate;
  const todo: ITodoTodo = await api.functional.todo.user.todos.create(
    connection,
    { body: todoCreateBody },
  );
  typia.assert(todo);
  TestValidator.equals("created user matches owner", todo.user.id, user.id);

  // 3. Delete the todo as owner
  await api.functional.todo.user.todos.erase(connection, { todoId: todo.id });

  // 4. No GET API provided, so we cannot check retrievability directly.
  // (In a real test, would attempt to GET and expect 404, but API is not given.)

  // 5. (Optional extra) Re-deleting should result in error. TestValidator.error for hard deletion.
  await TestValidator.error(
    "re-delete should fail: todo already deleted",
    async () => {
      await api.functional.todo.user.todos.erase(connection, {
        todoId: todo.id,
      });
    },
  );
}
