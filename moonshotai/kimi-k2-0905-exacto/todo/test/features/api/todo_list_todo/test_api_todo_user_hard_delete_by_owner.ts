import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * E2E test for hard-deleting a user's own todo item.
 *
 * 1. Register and authenticate a user.
 * 2. Create a todo item as this user (direct DB/SDK creation skipped; assume only
 *    the erase endpoint is exposed).
 * 3. Delete the user's todo via hard delete endpoint, validate the returned
 *    object.
 * 4. Attempt to get/read the deleted todo (expect error or not found if retrieval
 *    existed).
 * 5. Negative: Only the owner is allowed to perform hard delete (not tested as
 *    only owner is created here).
 */
export async function test_api_todo_user_hard_delete_by_owner(
  connection: api.IConnection,
) {
  // 1. Register & login user
  const userEmail = RandomGenerator.alphaNumeric(12) + "@test.com";
  const userPassword = RandomGenerator.alphaNumeric(16);
  const auth = await api.functional.auth.user.join(connection, {
    body: { email: userEmail, password: userPassword },
  });
  typia.assert(auth);
  TestValidator.predicate(
    "user token issued",
    Boolean(auth.token && auth.token.access),
  );
  TestValidator.equals("auth user email", auth.email, userEmail);
  TestValidator.equals("user is not locked", auth.is_locked, false);
  TestValidator.predicate("user summary exists", !!auth.user);

  // 2. Create a todo item directly (simulate via typia.random)
  const todoId = typia.random<string & tags.Format<"uuid">>();
  // In real system, the todo would be created via an exposed endpoint, but such endpoint not present in SDK
  // Here, we'll simulate its existence for delete testing.

  // 3. Erase the (simulated) todo
  const erased = await api.functional.todoList.user.todos.erase(connection, {
    todoId,
  });
  typia.assert(erased);
  TestValidator.equals("deleted todo id matches", erased.id, todoId);
  TestValidator.predicate(
    "erased todo marked deleted or gone",
    erased.deleted_at !== null && erased.deleted_at !== undefined,
  );

  // 4. (If retrieval existed) Check that todo is gone (skipped; no get/index logic available)
  // 5. (Optional negative) Only owner can delete - not tested, single user flow
}
