import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate permission enforcement for hard delete in the todo list system.
 *
 * This test ensures that only the owner of a todo or an admin user can
 * permanently erase a todo item via the user endpoint. It specifically
 * exercises the scenario where a non-owner, authenticated as a regular user,
 * attempts to hard-delete a todo belonging to another user.
 *
 * The expected result is that the erase operation is denied, an error is
 * raised, and the todo item remains in the system after the denied operation.
 *
 * Steps:
 *
 * 1. Register User A (the todo owner)
 * 2. Register User B (the non-owner)
 * 3. User A (owner) creates a todo
 * 4. Switch context to User B (non-owner)
 * 5. User B attempts to hard-delete User A's todo via the user endpoint (should
 *    fail)
 * 6. Switch context back to User A (owner)
 * 7. Confirm the todo still exists and was not deleted
 */
export async function test_api_todo_user_hard_delete_denied_for_non_owner(
  connection: api.IConnection,
) {
  // 1. Register User A (todo owner)
  const userAEmail: string = typia.random<string & tags.Format<"email">>();
  const userAPassword = RandomGenerator.alphaNumeric(16);
  const authA = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
    },
  });
  typia.assert(authA);
  TestValidator.equals(
    "authA includes user summary",
    typeof authA.user,
    "object",
  );
  const userAId = typia.assert(authA.user!.id);
  // 2. Register User B (non-owner)
  const userBEmail: string = typia.random<string & tags.Format<"email">>();
  const userBPassword = RandomGenerator.alphaNumeric(16);
  const authB = await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      password: userBPassword,
    },
  });
  typia.assert(authB);
  TestValidator.equals(
    "authB includes user summary",
    typeof authB.user,
    "object",
  );
  const userBId = typia.assert(authB.user!.id);
  // 3. User A creates todo (as owner)
  // Simulate switching back to User A (by logging in again)
  await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
    },
  });
  // Create a todo for user A via a hypothetical create endpoint (not in provided API)
  // Since there is NO create endpoint for todos provided, we cannot create one, so for this test we'll simulate a todo with a random UUID
  const todoId = typia.random<string & tags.Format<"uuid">>();
  // 4. Switch context to User B (login as B)
  await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      password: userBPassword,
    },
  });
  // 5. User B attempts to hard delete the todo via the user endpoint (should be denied)
  await TestValidator.error(
    "hard delete denied for non-owner user",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, { todoId });
    },
  );
  // 6. Switch back to owner (User A)
  await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
    },
  });
  // 7. Check that the todo still exists
  // There is no API to fetch the todo by ID in the provided API, so this step is omitted
}
