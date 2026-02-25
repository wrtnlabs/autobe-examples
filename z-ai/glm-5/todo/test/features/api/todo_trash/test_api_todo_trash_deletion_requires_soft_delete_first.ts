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

export async function test_api_todo_trash_deletion_requires_soft_delete_first(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  /**
   * Test business rule: cannot permanently delete a todo that is not in trash.
   * The permanent deletion endpoint only works on todos that have been
   * properly soft-deleted first. Attempting to skip the soft delete step
   * results in a 404 error, protecting active todos from accidental deletion.
   */
  // 1. User authentication - create a new user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create an active todo (not deleted) that will be used to test the business rule
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {},
  );
  typia.assert(todo);
  // Verify the todo is active (not deleted)
  TestValidator.equals("todo is not deleted", todo.isDeleted, false);
  // 3. Attempt to permanently delete the ACTIVE todo using the trash endpoint
  // This should fail with 404 because the todo is not in trash (is_deleted = false)
  await TestValidator.httpError(
    "permanent deletion requires soft delete first",
    404,
    async () => {
      await api.functional.todoApp.user.trash.erase(userConnection, {
        todoId: todo.id,
      });
    },
  );
}
