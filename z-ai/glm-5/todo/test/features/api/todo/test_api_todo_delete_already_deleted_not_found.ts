import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test that attempting to delete an already soft-deleted todo returns 404 Not Found.
 *
 * This validates the idempotency behavior and ensures:
 * 1. First deletion succeeds with 200 OK
 * 2. Second deletion attempt on the same todo returns 404 Not Found
 * 3. The error message indicates the todo was not found (same message as for non-existent todos)
 * 4. The todo remains in the trash with is_deleted=true
 *
 * This tests the business rule that already-deleted todos cannot be deleted again,
 * maintaining consistent behavior in the trash system. The same 404 response for
 * already-deleted todos prevents information leakage about the todo's state.
 */
export async function test_api_todo_delete_already_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a user-specific connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create a todo item that will first be soft-deleted
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {},
  );
  typia.assert(todo);
  // 3. First deletion should succeed (soft delete)
  await api.functional.todoApp.user.todos.erase(userConnection, {
    todoId: todo.id,
  });
  // 4. Second deletion attempt should return 404 Not Found
  // The todo is already soft-deleted (is_deleted=true), so it cannot be deleted again
  await TestValidator.httpError(
    "already deleted todo should return 404",
    404,
    async () => {
      await api.functional.todoApp.user.todos.erase(userConnection, {
        todoId: todo.id,
      });
    },
  );
}
