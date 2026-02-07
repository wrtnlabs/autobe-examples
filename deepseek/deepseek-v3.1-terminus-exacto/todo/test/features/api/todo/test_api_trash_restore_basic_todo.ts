import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItem";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_app_user_trash_post } from "../../../generate/generate_random_todo_app_user_trash_post";
import { prepare_random_todo_app_trash_item } from "../../../prepare/prepare_random_todo_app_trash_item";

export async function test_api_trash_restore_basic_todo(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userAuth);
  // Generate a todo ID to use for testing
  const todoId = typia.random<string & tags.Format<"uuid">>();
  // Create trash item with the todo ID
  const trashItem = await generate_random_todo_app_user_trash_post(
    userConnection,
    {
      body: {
        todo_app_todo_id: todoId,
      } satisfies ITodoAppTrashItem.ICreate,
    },
  );
  typia.assert(trashItem);
  // Verify trash item was created with correct data
  TestValidator.equals("todo id matches", trashItem.todo.id, todoId);
  TestValidator.predicate(
    "trash item has deletion timestamp",
    trashItem.deleted_at !== null,
  );
  TestValidator.equals("trash item not restored", trashItem.restored_at, null);
  TestValidator.equals(
    "trash item not permanently deleted",
    trashItem.permanently_deleted_at,
    null,
  );
  // Restore todo from trash - use the original todo ID as required by API
  const restoredTrashItem = await api.functional.todoApp.user.trash.post(
    userConnection,
    {
      body: {
        todo_app_todo_id: todoId, // Use original todo ID, not trash item ID
      } satisfies ITodoAppTrashItem.ICreate,
    },
  );
  typia.assert(restoredTrashItem);
  // Validate restoration
  TestValidator.equals("todo ID preserved", restoredTrashItem.todo.id, todoId);
  TestValidator.predicate(
    "restoration timestamp set",
    restoredTrashItem.restored_at !== null,
  );
  TestValidator.equals(
    "not permanently deleted",
    restoredTrashItem.permanently_deleted_at,
    null,
  );
  TestValidator.predicate(
    "original deletion timestamp preserved",
    restoredTrashItem.deleted_at !== null,
  );
}
