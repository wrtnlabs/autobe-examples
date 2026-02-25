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

export async function test_api_user_dashboard_comprehensive_overview(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated user session
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Step 2: Create 5 todos total
  const todos: ITodoAppTodo[] = await ArrayUtil.asyncRepeat(5, async () => {
    const todo = await generate_random_todo_app_user_todos_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    return todo;
  });
  // Note: Completion status testing is limited by available API functionality
  // The ITodoAppTodo schema shows completion_status but no API endpoint to modify it
  // Dashboard aggregates completion status from todo_app_todo_completions table
  // Step 3: Delete 1 todo to verify trash statistics
  await api.functional.todoApp.user.todos.erase(userConnection, {
    todoId: todos[0].id,
  });
  // Step 4: Retrieve dashboard data
  const dashboard =
    await api.functional.todoApp.user.dashboard.at(userConnection);
  typia.assert(dashboard);
  // Step 5: Validate dashboard statistics
  TestValidator.equals("total todos count", dashboard.total_todos, 4); // 5 created - 1 deleted
  TestValidator.predicate(
    "completion percentage valid",
    dashboard.completion_percentage >= 0 &&
      dashboard.completion_percentage <= 100,
  );
  // Step 6: Validate trash statistics
  TestValidator.equals(
    "total deleted count",
    dashboard.trash_statistics.total_deleted_count,
    1,
  );
  TestValidator.predicate(
    "retention period positive",
    dashboard.trash_statistics.retention_period_days > 0,
  );
  // Step 7: Validate structure matches schema
  TestValidator.predicate(
    "has recent activity array",
    Array.isArray(dashboard.recent_activity),
  );
  TestValidator.predicate(
    "has trash statistics object",
    typeof dashboard.trash_statistics === "object",
  );
}
