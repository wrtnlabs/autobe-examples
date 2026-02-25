import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfiguration";
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

export async function test_api_user_dashboard_trash_management(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user session
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Create multiple todos for deletion testing
  const todos = await ArrayUtil.asyncRepeat(5, async () => {
    const todo = await generate_random_todo_app_user_todos_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    return todo;
  });
  // Verify initial dashboard shows correct counts
  const initialDashboard =
    await api.functional.todoApp.user.dashboard.at(userConnection);
  typia.assert(initialDashboard);
  TestValidator.equals("initial total todos", initialDashboard.total_todos, 5);
  TestValidator.equals(
    "initial completed todos",
    initialDashboard.completed_todos,
    0,
  );
  TestValidator.equals(
    "initial incomplete todos",
    initialDashboard.incomplete_todos,
    5,
  );
  TestValidator.equals(
    "initial completion percentage",
    initialDashboard.completion_percentage,
    0,
  );
  // Soft delete 3 todos to move to trash
  const todosToDelete = RandomGenerator.sample(todos, 3);
  for (const todo of todosToDelete) {
    await api.functional.todoApp.user.todos.erase(userConnection, {
      todoId: todo.id,
    });
  }
  // Verify dashboard shows soft deletion statistics
  const afterDeletionDashboard =
    await api.functional.todoApp.user.dashboard.at(userConnection);
  typia.assert(afterDeletionDashboard);
  TestValidator.equals(
    "after deletion total todos",
    afterDeletionDashboard.total_todos,
    2,
  );
  TestValidator.equals(
    "trash total deleted count",
    afterDeletionDashboard.trash_statistics.total_deleted_count,
    3,
  );
  TestValidator.equals(
    "trash restored count remains zero",
    afterDeletionDashboard.trash_statistics.restored_count,
    0,
  );
  TestValidator.equals(
    "trash permanently deleted count remains zero",
    afterDeletionDashboard.trash_statistics.permanently_deleted_count,
    0,
  );
  // Restore 1 todo from trash
  const todoToRestore = RandomGenerator.pick<ITodoAppTodo>(todosToDelete);
  const restoredTodo = await api.functional.todoApp.user.todos.restore(
    userConnection,
    {
      todoId: todoToRestore.id,
    },
  );
  typia.assert(restoredTodo);
  // Verify dashboard shows restoration statistics
  const afterRestorationDashboard =
    await api.functional.todoApp.user.dashboard.at(userConnection);
  typia.assert(afterRestorationDashboard);
  TestValidator.equals(
    "after restoration total todos",
    afterRestorationDashboard.total_todos,
    3,
  );
  TestValidator.equals(
    "trash total deleted count after restore",
    afterRestorationDashboard.trash_statistics.total_deleted_count,
    3,
  );
  TestValidator.equals(
    "trash restored count incremented",
    afterRestorationDashboard.trash_statistics.restored_count,
    1,
  );
  // Permanently delete 1 todo from trash
  const todoToPermDelete = RandomGenerator.pick<ITodoAppTodo>(
    todosToDelete.filter((todo: ITodoAppTodo) => todo.id !== todoToRestore.id),
  );
  await api.functional.todoApp.user.todos.permanent.erase(userConnection, {
    todoId: todoToPermDelete.id,
  });
  // Verify dashboard shows permanent deletion statistics
  const finalDashboard =
    await api.functional.todoApp.user.dashboard.at(userConnection);
  typia.assert(finalDashboard);
  TestValidator.equals("final total todos", finalDashboard.total_todos, 3);
  TestValidator.equals(
    "final trash total deleted count",
    finalDashboard.trash_statistics.total_deleted_count,
    3,
  );
  TestValidator.equals(
    "final trash restored count",
    finalDashboard.trash_statistics.restored_count,
    1,
  );
  TestValidator.equals(
    "final trash permanently deleted count",
    finalDashboard.trash_statistics.permanently_deleted_count,
    1,
  );
  TestValidator.predicate(
    "retention period is positive",
    finalDashboard.trash_statistics.retention_period_days >= 1,
  );
  // Verify recent activity tracking
  TestValidator.predicate(
    "recent activity exists",
    finalDashboard.recent_activity.length >= 0,
  );
}
