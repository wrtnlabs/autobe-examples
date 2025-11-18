import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validate permanent deletion prohibition for non-owner todo deletion.
 *
 * This test verifies that it is forbidden for a user (User B) to permanently
 * delete a todo owned by another user (User A).
 *
 * Scenario Steps:
 *
 * 1. Register User A with unique credentials
 * 2. User A creates a new todo item
 * 3. Register User B with unique credentials
 * 4. User B (authenticated) attempts to permanently erase User A's todo
 * 5. Confirm deletion is forbidden with appropriate authorization error
 */
export async function test_api_todo_permanent_deletion_non_owner_forbidden(
  connection: api.IConnection,
) {
  // 1. Register User A
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userA = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: RandomGenerator.alphaNumeric(10),
      href: "https://test-app.com/join",
      referrer: "https://test-app.com/landing",
      ip: null,
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userA);

  // 2. User A creates a todo
  const todo = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 10,
      }),
      description: RandomGenerator.paragraph({
        sentences: 6,
        wordMin: 3,
        wordMax: 10,
      }),
      due_date: null,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);

  // 3. Register User B
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userB = await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      password: RandomGenerator.alphaNumeric(10),
      href: "https://test-app.com/join",
      referrer: "https://test-app.com/landing",
      ip: null,
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userB);

  // 4. User B (now authenticated) attempts to erase User A's todo
  await TestValidator.error(
    "non-owner deletion of another user's todo should be forbidden",
    async () => {
      await api.functional.todoApp.user.todos.erase(connection, {
        todoId: todo.id,
      });
    },
  );
}
