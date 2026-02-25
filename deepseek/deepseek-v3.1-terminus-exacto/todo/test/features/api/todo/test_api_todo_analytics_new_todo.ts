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

export async function test_api_todo_analytics_new_todo(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Create a new todo
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo);
  // Retrieve analytics immediately after creation
  const analytics = await api.functional.todoApp.user.todos.analytics(
    userConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(analytics);
  // Validate completion statistics for new todo
  TestValidator.equals(
    "total completions should be 0",
    analytics.completion_statistics.total_completions,
    0,
  );
  TestValidator.equals(
    "completion rate should be 0",
    analytics.completion_statistics.completion_rate,
    0,
  );
  TestValidator.equals(
    "last completion timestamp should be null",
    analytics.completion_statistics.last_completion_at,
    null,
  );
  TestValidator.predicate(
    "average completion time should be 0",
    analytics.completion_statistics.average_completion_time_minutes === 0,
  );
  // Validate edit history metrics for new todo
  TestValidator.equals(
    "total edits should be 0",
    analytics.edit_history_metrics.total_edits,
    0,
  );
  TestValidator.equals(
    "recent edit timestamp should be null",
    analytics.edit_history_metrics.recent_edit_at,
    null,
  );
  TestValidator.equals(
    "title changes should be 0",
    analytics.edit_history_metrics.field_change_counts.title_changes,
    0,
  );
  TestValidator.equals(
    "description changes should be 0",
    analytics.edit_history_metrics.field_change_counts.description_changes,
    0,
  );
  TestValidator.equals(
    "start date changes should be 0",
    analytics.edit_history_metrics.field_change_counts.start_date_changes,
    0,
  );
  TestValidator.equals(
    "due date changes should be 0",
    analytics.edit_history_metrics.field_change_counts.due_date_changes,
    0,
  );
  // Validate timing insights
  TestValidator.equals(
    "created at should match todo creation",
    analytics.timing_insights.created_at,
    todo.created_at,
  );
  TestValidator.predicate(
    "time since creation should be >= 0",
    analytics.timing_insights.time_since_creation_minutes >= 0,
  );
  TestValidator.equals(
    "completion frequency should be 0",
    analytics.timing_insights.completion_frequency_minutes,
    0,
  );
}
