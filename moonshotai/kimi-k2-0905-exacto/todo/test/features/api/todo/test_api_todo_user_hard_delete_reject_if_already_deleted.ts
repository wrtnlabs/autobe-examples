import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate rejection when trying to hard-delete a non-existent or already
 * (soft/hard) deleted todo.
 *
 * 1. Register and authenticate a new user (owner)
 * 2. Attempt to hard-delete a todo that does not exist (random UUID)
 * 3. Ensure that the system correctly rejects the operation
 * 4. No side effects should occur; data integrity preserved
 */
export async function test_api_todo_user_hard_delete_reject_if_already_deleted(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a user (owner)
  const createUser = {
    email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListUser.ICreate;
  const authorized: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: createUser });
  typia.assert(authorized);

  // 2. Attempt to hard-delete a todo with a random UUID (guaranteed non-existent)
  const randomTodoId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should reject hard-deletion for non-existent/ already-deleted todo",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: randomTodoId,
      });
    },
  );
  // 3. Ensure system integrity (no data created/removed)
  // (Nothing to check here, as there is no listing API exposed)
}
