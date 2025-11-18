import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate strict ownership checks for deleting todos: another user cannot
 * delete a todo they do not own.
 *
 * This test validates that the API correctly prevents a user from deleting
 * another user's todo. It executes a full authentication and resource creation
 * flow for user A, then simulates an access violation attempt by user B. Each
 * step is annotated for clarity.
 *
 * Steps:
 *
 * 1. User A registers an account (api.functional.auth.user.join)
 * 2. User A creates a todo (api.functional.todoList.user.todos.create)
 * 3. User B registers a separate account (api.functional.auth.user.join)
 * 4. User B attempts to delete user A's todo
 *    (api.functional.todoList.user.todos.erase) -- expected to fail
 */
export async function test_api_todo_delete_not_owned_forbidden(
  connection: api.IConnection,
) {
  // 1. Register user A
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = typia.random<string & tags.Format<"password">>();
  const joinA = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
      href: "https://service.example.com/register",
      referrer: "https://service.example.com/landing",
      display_name: RandomGenerator.name(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(joinA);
  const userAInfo = typia.assert(joinA.user!);

  // 2. User A creates a todo
  const todoA = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 5,
        wordMin: 3,
        wordMax: 10,
      }),
      description: RandomGenerator.paragraph({
        sentences: 12,
        wordMin: 4,
        wordMax: 10,
      }),
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todoA);

  // 3. Register user B (switch authentication context)
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = typia.random<string & tags.Format<"password">>();
  const joinB = await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      password: userBPassword,
      href: "https://service.example.com/register",
      referrer: "https://service.example.com/landing",
      display_name: RandomGenerator.name(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(joinB);
  const userBInfo = typia.assert(joinB.user!);

  // 4. User B attempts to delete user A's todo and should fail authorization
  await TestValidator.error(
    "user B cannot delete user A's todo (ownership enforced)",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: todoA.id,
      });
    },
  );
}
