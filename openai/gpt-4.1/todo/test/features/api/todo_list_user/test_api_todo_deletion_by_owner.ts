import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate the irreversible deletion of a todo item by its registered owner,
 * and protection from unauthorized deletion by others.
 *
 * This test verifies that:
 *
 * 1. A registered user (User A) can delete their own todo item (by todoId) using
 *    the DELETE /todoList/user/todos/{todoId} endpoint.
 * 2. The deletion is irreversible: Once deleted, any access to the same todoId
 *    must fail.
 * 3. Only the owner can perform deletion: Another user (User B) cannot delete a
 *    todo owned by User A (expected to fail).
 *
 * The workflow is as follows:
 *
 * - Register User A (obtain authentication context via
 *   api.functional.auth.user.join)
 * - [Assume the creation of a todo item for User A, and obtain its todoId — in a
 *   production test, this would require a create endpoint. Here it will be
 *   simulated with a random UUID.]
 * - Successfully delete the (simulated) todo item as User A.
 * - Attempt to delete the same todo a second time as User A: expect error.
 * - Register User B (unique credentials)
 * - Attempt to delete User A's (already deleted) todo as User B: expect error
 *   (unauthorized or not found).
 */
export async function test_api_todo_deletion_by_owner(
  connection: api.IConnection,
) {
  // --- Register User A (owner)
  const userA = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<
        string & tags.MinLength<5> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
      href: "https://autobe.test/a",
      referrer: "https://autobe.test/",
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(userA);

  // Simulate (mock) a todo item's UUID belonging to User A
  const todoId = typia.random<string & tags.Format<"uuid">>();

  // --- Attempt to delete the todo as the owner (User A)
  await api.functional.todoList.user.todos.erase(connection, { todoId });

  // --- Attempt to delete again as User A; expect this to fail (irreversible)
  await TestValidator.error(
    "Deleting a todo twice should fail (irreversible)",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, { todoId });
    },
  );

  // --- Register User B (another user, cannot interfere with User A's todos)
  const userB = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<
        string & tags.MinLength<5> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
      href: "https://autobe.test/b",
      referrer: "https://autobe.test/",
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(userB);

  // --- Attempt deletion as non-owner (User B); expect failure
  await TestValidator.error(
    "Non-owner cannot delete another user's todo",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, { todoId });
    },
  );
}
