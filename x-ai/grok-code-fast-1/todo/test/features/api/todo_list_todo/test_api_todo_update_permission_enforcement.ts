import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Ensures only the owner of a todo can update its details in user context.
 *
 * This test covers RBAC permission enforcement for the todo update operation.
 * It:
 *
 * 1. Registers user A (owner)
 * 2. As user A, creates a todo
 * 3. Registers user B (non-owner)
 * 4. As user B, attempts to update user A's todo
 * 5. Verifies that the update is forbidden/denied for non-owner
 *
 * Business logic verified: Ownership is enforced strictly (no update allowed
 * unless owning user session). All test data is isolated via random values per
 * run.
 */
export async function test_api_todo_update_permission_enforcement(
  connection: api.IConnection,
) {
  // 1. Register user A (the owner)
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: ownerEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      href: "https://test-owner.example.com/signup",
      referrer: "https://test-owner.example.com/start",
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(ownerJoin);

  // 2. As owner, create a todo
  const ownerTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 12,
        }),
        description: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 4,
          wordMax: 16,
        }),
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(ownerTodo);

  // 3. Register user B (a different user)
  const attackerEmail = typia.random<string & tags.Format<"email">>();
  const attackerJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: attackerEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      href: "https://test-attacker.example.com/signup",
      referrer: "https://test-attacker.example.com/start",
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(attackerJoin);

  // 4. As user B, try to update user A's todo
  await TestValidator.error("non-owner cannot update a todo", async () => {
    await api.functional.todoList.user.todos.update(connection, {
      todoId: ownerTodo.id,
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies ITodoListTodo.IUpdate,
    });
  });
}
