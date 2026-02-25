import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTrashItemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItemMetadatum";
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

export async function test_api_trash_metadata_retrieval_for_recently_deleted_todo(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register
  const userConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(auth);
  // Create todo item
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo);
  // Soft delete the todo to move it to trash
  await api.functional.todoApp.user.todos.erase(userConnection, {
    todoId: todo.id,
  });
  // Retrieve trash metadata using the trash item ID
  const metadata = await api.functional.todoApp.user.todos.trash.metadata.at(
    userConnection,
    {
      trashItemId: todo.id satisfies string & tags.Format<"uuid">,
    },
  );
  typia.assert(metadata);
  // Validate metadata business logic (not type validation)
  TestValidator.predicate(
    "cleanup eligible should be false for recent deletion",
    metadata.cleanup_eligible === false,
  );
  TestValidator.predicate(
    "retention expiration timestamp exists",
    metadata.retention_expires_at.length > 0,
  );
  TestValidator.equals(
    "no cleanup scheduled",
    metadata.cleanup_scheduled_at,
    null,
  );
  TestValidator.equals(
    "manual cleanup not requested",
    metadata.manual_cleanup_requested,
    false,
  );
  TestValidator.equals(
    "no cleanup processed",
    metadata.cleanup_processed_at,
    null,
  );
  TestValidator.equals(
    "trash item ID matches todo ID",
    metadata.todo_app_trash_item_id,
    todo.id,
  );
}
