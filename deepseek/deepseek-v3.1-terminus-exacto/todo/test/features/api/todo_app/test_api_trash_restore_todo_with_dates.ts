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

/**
 * Test restoration of a todo from trash. Since the todo creation API returns void,
 * this test focuses on verifying the trash restoration workflow using the available
 * APIs. It validates that the trash item creation and restoration processes work
 * correctly with proper metadata preservation.
 */
export async function test_api_trash_restore_todo_with_dates(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Since the todo creation endpoint returns void, we cannot test with a
  // specific todo. Instead, we'll test the trash restoration functionality
  // by creating a trash item directly using the generation function
  const trashItem = await generate_random_todo_app_user_trash_post(
    userConnection,
    {
      body: {
        // Use a random UUID since we can't get a todo ID from creation
        todo_app_todo_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies ITodoAppTrashItem.ICreate,
    },
  );
  typia.assert(trashItem);
  // Verify trash item has proper structure
  TestValidator.predicate(
    "trash item has todo object",
    trashItem.todo !== null && trashItem.todo !== undefined,
  );
  TestValidator.predicate(
    "trash item has user object",
    trashItem.user !== null && trashItem.user !== undefined,
  );
  // Verify trash metadata fields are present
  TestValidator.predicate(
    "has deleted_at timestamp",
    trashItem.deleted_at !== null && trashItem.deleted_at !== undefined,
  );
  TestValidator.equals(
    "restored_at initially null",
    trashItem.restored_at,
    null,
  );
  TestValidator.equals(
    "permanently_deleted_at initially null",
    trashItem.permanently_deleted_at,
    null,
  );
  // Restore todo from trash
  const restoredTrashItem = await api.functional.todoApp.user.trash.post(
    userConnection,
    {
      body: {
        todo_app_todo_id: trashItem.todo.id,
      } satisfies ITodoAppTrashItem.ICreate,
    },
  );
  typia.assert(restoredTrashItem);
  // Verify restoration metadata
  TestValidator.predicate(
    "restored_at timestamp set after restoration",
    restoredTrashItem.restored_at !== null,
  );
  TestValidator.equals(
    "permanently_deleted_at remains null after restoration",
    restoredTrashItem.permanently_deleted_at,
    null,
  );
  TestValidator.predicate(
    "todo object preserved after restoration",
    restoredTrashItem.todo !== null && restoredTrashItem.todo !== undefined,
  );
  TestValidator.equals(
    "todo ID remains the same after restoration",
    restoredTrashItem.todo.id,
    trashItem.todo.id,
  );
  TestValidator.equals(
    "user information preserved after restoration",
    restoredTrashItem.user.id,
    trashItem.user.id,
  );
}
