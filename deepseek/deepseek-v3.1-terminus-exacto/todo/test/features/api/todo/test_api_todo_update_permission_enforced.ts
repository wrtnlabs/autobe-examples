import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Permission enforcement for updating todo items.
 *
 * This test validates that users cannot update todo items belonging to other
 * users, ensuring data privacy and correct business rule enforcement for
 * ownership changes in the todo list service. The test includes: (1) Creating
 * two users (userA, userB), (2) userA creates a todo, (3) userB attempts to
 * update userA's todo, (4) Verifies the system rejects the unauthorized update
 * and does not leak todo data.
 */
export async function test_api_todo_update_permission_enforced(
  connection: api.IConnection,
) {
  // Register user A and authenticate
  const userAEmail = RandomGenerator.alphaNumeric(8) + "@example.com";
  const userAPassword = RandomGenerator.alphaNumeric(12);
  const userA = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userA);

  // User A creates a todo
  const todoA = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 8,
      }),
      status: "pending",
      description: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 6,
        wordMax: 12,
      }),
      due_date: null,
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todoA);

  // Register user B (switch context)
  const userBEmail = RandomGenerator.alphaNumeric(8) + "@example.com";
  const userBPassword = RandomGenerator.alphaNumeric(12);
  const userB = await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      password: userBPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userB);

  // User B attempts to update user A's todo
  await TestValidator.error(
    "user B cannot update user A's todo (permission denied)",
    async () => {
      await api.functional.todoList.user.todos.update(connection, {
        todoId: todoA.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          status: "completed",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          due_date: null,
        } satisfies ITodoListTodo.IUpdate,
      });
    },
  );
}
