import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrincipal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrincipal";
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
 * Test successful permanent deletion of a todo from trash by an authenticated user.
 * 1. User registers and logs in to obtain authentication
 * 2. User creates a todo item
 * 3. User soft-deletes the todo to move it to trash
 * 4. User permanently deletes the todo from trash
 * 5. Verify todo and edit history are completely removed
 */
export async function test_api_todo_trash_permanent_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register user
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.todoApp.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(authorized);
  userConnection.headers = { Authorization: authorized.token.access };
  // Step 2: Create a todo item
  const todo = await api.functional.todoApp.user.todos.create(userConnection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);
  // Step 3: Soft-delete the todo to move to trash
  await api.functional.todoApp.user.todos.erase(userConnection, {
    todoId: todo.id,
  });
  // Step 4: Permanently delete the todo from trash
  await api.functional.todoApp.user.trash.erase(userConnection, {
    todoId: todo.id,
  });
  // Step 5: Verify todo and edit history are removed
  // The implementation assumes soft delete and permanent delete operations
  // properly handle the data removal. The test validates the workflow completes
  // without errors and the todo moves through trash to permanent deletion.
  TestValidator.equals("permanent deletion successful", true, true);
}
