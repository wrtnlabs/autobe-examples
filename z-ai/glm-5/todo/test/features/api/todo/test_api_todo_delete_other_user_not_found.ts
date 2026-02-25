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
 * Test privacy enforcement by verifying that a user cannot delete another user's todo.
 *
 * This validates complete data isolation between users:
 * 1. User A creates a todo and gets its ID
 * 2. User B attempts to delete User A's todo using that ID
 * 3. The system returns 404 Not Found (not 403 Forbidden)
 * 4. This prevents information leakage about other users' data
 *
 * The key privacy rule: the same 404 response is returned whether the todo
 * doesn't exist, belongs to another user, or is already deleted.
 */
export async function test_api_todo_delete_other_user_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create User A who will own the todo
  const userAConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userAConnection, {});
  // 2. User A creates a todo - this ID will be used by User B
  const todo = await generate_random_todo_app_user_todos_create(
    userAConnection,
    {},
  );
  typia.assert(todo);
  // 3. Create User B who will attempt unauthorized deletion
  const userBConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userBConnection, {});
  // 4. User B attempts to delete User A's todo - should return 404 Not Found
  await TestValidator.httpError(
    "User B cannot delete User A's todo",
    404,
    async () => {
      await api.functional.todoApp.user.todos.erase(userBConnection, {
        todoId: todo.id,
      });
    },
  );
}
