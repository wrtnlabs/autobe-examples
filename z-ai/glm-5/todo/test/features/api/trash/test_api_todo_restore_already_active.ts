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
 * Test business rule validation: Verify that attempting to restore a todo
 * that is already active (is_deleted=false) returns a 400 Bad Request error.
 *
 * Steps:
 * 1) User authenticates and creates a todo.
 * 2) User attempts to restore the newly created todo without deleting it first.
 * 3) Verify the response returns 400 Bad Request with appropriate error message.
 * 4) Verify the todo remains unchanged in the active todo list.
 */
export async function test_api_todo_restore_already_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. User setup - create a new connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create an active todo (not deleted)
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {},
  );
  typia.assert(todo);
  // Verify the todo is active (not deleted)
  TestValidator.predicate("todo is active", todo.isDeleted === false);
  // 3. Attempt to restore an already active todo - should fail with 400
  await TestValidator.httpError(
    "restore active todo returns 400",
    400,
    async () => {
      await api.functional.todoApp.user.trash.restore(userConnection, {
        todoId: todo.id,
      });
    },
  );
}
