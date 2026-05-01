import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test that a member cannot permanently delete another member's trashed todo.
 *
 * Validates user isolation in the trash permanent delete operation. User A creates and soft-deletes a todo, placing it in the trash. User B then attempts to permanently delete User A's trashed todo using User A's todoId. The server must reject this cross-user access with a 403 Forbidden response, confirming that the ownership check prevents unauthorized trash operations.
 *
 * 1. User A registers via join and creates a todo.
 * 2. User A soft-deletes the todo, moving it to the trash.
 * 3. User B registers via join with a separate connection.
 * 4. User B attempts to permanently delete User A's trashed todo.
 * 5. Verify 403 Forbidden response for the cross-user permanent delete attempt.
 */
export async function test_api_todo_trash_permanent_delete_cross_user_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. User A setup
  const userAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(userAConnection, {});
  const userATodo = await generate_random_todo_app_member_todos_create(
    userAConnection,
    {},
  );
  typia.assert(userATodo);
  // 2. User A soft-deletes the todo
  await api.functional.todoApp.member.todos.erase(userAConnection, {
    todoId: userATodo.id,
  });
  // 3. User B setup
  const userBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(userBConnection, {});
  // 4. User B attempts permanent delete of User A's trashed todo → 403
  await TestValidator.httpError(
    "cross-user permanent delete forbidden",
    403,
    async () =>
      await api.functional.todoApp.member.todos.trash.erase(userBConnection, {
        todoId: userATodo.id,
      }),
  );
}
