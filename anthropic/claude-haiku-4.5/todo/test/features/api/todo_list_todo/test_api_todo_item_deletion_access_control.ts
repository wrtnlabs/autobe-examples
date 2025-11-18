import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that todo deletion is restricted to the item owner and not possible
 * by other users.
 *
 * 1. Register and authenticate User A (the owner)
 * 2. Create a todo item as User A
 * 3. Register and authenticate User B (another user)
 * 4. Attempt to delete User A's todo as User B (must fail)
 * 5. Re-authenticate as User A
 * 6. Successfully delete the todo as the owner
 */
export async function test_api_todo_item_deletion_access_control(
  connection: api.IConnection,
) {
  // 1. Register and authenticate User A
  const emailA = typia.random<string & tags.Format<"email">>();
  const joinA = await api.functional.auth.user.join(connection, {
    body: {
      email: emailA,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://test-app.io/register",
      referrer: "https://test-app.io/welcome",
      ip: null,
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(joinA);
  const userAId = joinA.id;

  // 2. Create a todo item as User A
  const todo = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: null,
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo);
  const todoId = todo.id;

  // 3. Register and authenticate User B
  const emailB = typia.random<string & tags.Format<"email">>();
  const joinB = await api.functional.auth.user.join(connection, {
    body: {
      email: emailB,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://test-app.io/register",
      referrer: "https://test-app.io/welcome",
      ip: null,
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(joinB);
  const userBId = joinB.id;

  // 4. Attempt to delete User A's todo as User B (should fail)
  await TestValidator.error(
    "user B cannot delete todo belonging to user A",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, { todoId });
    },
  );

  // 5. Re-authenticate as User A
  await api.functional.auth.user.join(connection, {
    body: {
      email: emailA,
      password: joinA.token.access,
      href: "https://test-app.io/login",
      referrer: "https://test-app.io/welcome",
      ip: null,
    } satisfies ITodoListUser.IJoin,
  });

  // 6. Successfully delete the todo as the owner (no error expected)
  await api.functional.todoList.user.todos.erase(connection, { todoId });
}
