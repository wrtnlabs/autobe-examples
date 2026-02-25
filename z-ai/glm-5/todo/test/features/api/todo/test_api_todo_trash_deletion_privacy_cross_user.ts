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
 * Test privacy enforcement: User B cannot permanently delete User A's todo from trash.
 *
 * This test verifies cross-user privacy isolation:
 * 1. User A creates and soft-deletes a todo (moves to trash)
 * 2. User B attempts to permanently delete User A's todo from trash
 * 3. Request should fail with 404 (same response as if todo doesn't exist)
 * 4. This prevents information leakage about other users' data
 */
export async function test_api_todo_trash_deletion_privacy_cross_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. User A joins
  const userAConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userAConnection, {});
  // 2. User A creates a todo
  const todo = await generate_random_todo_app_user_todos_create(
    userAConnection,
    {},
  );
  typia.assert(todo);
  // 3. User A soft deletes the todo (moves to trash)
  await api.functional.todoApp.user.todos.erase(userAConnection, {
    todoId: todo.id,
  });
  // 4. User B joins as a different user
  const userBConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userBConnection, {});
  // 5. User B attempts to permanently delete User A's todo from trash
  // Should fail with 404 because todo belongs to User A
  await TestValidator.httpError(
    "User B cannot permanently delete User A's todo from trash",
    404,
    async () => {
      await api.functional.todoApp.user.trash.erase(userBConnection, {
        todoId: todo.id,
      });
    },
  );
}
