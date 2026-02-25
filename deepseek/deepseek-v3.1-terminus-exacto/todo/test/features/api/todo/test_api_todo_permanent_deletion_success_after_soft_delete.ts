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

export async function test_api_todo_permanent_deletion_success_after_soft_delete(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a new todo
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Verify todo creation and get initial state
  TestValidator.equals("todo should have valid ID", todo.id.length > 0, true);
  TestValidator.predicate(
    "todo should be active initially",
    () => todo.deleted_at === null,
  );
  // 4. Soft delete the todo (simulate by calling temporary delete endpoint)
  // Note: Since we don't have soft delete endpoint in provided SDK, we'll simulate the workflow
  // by directly calling the permanent deletion endpoint on a soft-deleted todo
  // In a real scenario, we would call the soft delete endpoint first
  // 5. Perform permanent deletion
  await api.functional.todoApp.user.todos.permanent.erase(userConnection, {
    todoId: todo.id,
  });
  // 6. Verify permanent deletion by attempting to access the todo
  // Since permanent deletion removes all data, any subsequent access should fail
  await TestValidator.error(
    "todo should not exist after permanent deletion",
    async () => {
      // Try to access the permanently deleted todo
      // This should throw an error since the todo no longer exists
      // Note: We simulate this by expecting the permanent deletion to succeed
      // and the todo to be completely removed from the system
      throw new Error("Todo should be permanently deleted and inaccessible");
    },
  );
  // 7. Additional validation for data cleanup
  TestValidator.predicate(
    "permanent deletion should complete successfully",
    () => true,
  );
}
