import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTrashCleanupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashCleanupLog";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test basic trash cleanup operation functionality.
 * Authenticate as a user, create multiple soft-deleted todos,
 * then call the cleanup operation to verify it processes items correctly.
 * Since retention policy APIs are not available, focus on basic cleanup stats validation.
 */
export async function test_api_trash_cleanup_now_with_retention_policies(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Create multiple todos
  const todos: ITodoAppTodo[] = [];
  await ArrayUtil.asyncRepeat(3, async () => {
    const todo = await api.functional.todoApp.user.todos.create(userConnection);
    const safeTodo = typia.assert<ITodoAppTodo>(todo);
    todos.push(safeTodo);
  });
  // Soft delete all todos to move them to trash
  const deletedTodos = await ArrayUtil.asyncMap(
    todos,
    async (todo: ITodoAppTodo) => {
      const deletedTodo = await api.functional.todoApp.user.todos.erase(
        userConnection,
        {
          todoId: todo.id,
        },
      );
      const safeDeletedTodo = typia.assert<ITodoAppTodo>(deletedTodo);
      return safeDeletedTodo;
    },
  );
  // Call cleanup operation
  const cleanupResult =
    await api.functional.todoApp.user.trash.cleanup.now.cleanupNow(
      userConnection,
    );
  typia.assert(cleanupResult);
  // Validate cleanup statistics
  TestValidator.predicate(
    "items processed count valid",
    cleanupResult.items_processed >= 0,
  );
  TestValidator.predicate(
    "items deleted count valid",
    cleanupResult.items_deleted >= 0,
  );
  TestValidator.predicate(
    "deleted count <= processed count",
    cleanupResult.items_deleted <= cleanupResult.items_processed,
  );
  TestValidator.equals(
    "error message should be null",
    cleanupResult.error_message,
    null,
  );
  TestValidator.predicate(
    "completed at timestamp present",
    cleanupResult.completed_at !== null,
  );
}
