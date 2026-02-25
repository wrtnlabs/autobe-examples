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

export async function test_api_todo_analytics_comprehensive_statistics(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authentication using available SDK
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await api.functional.todoApp.auth.user.join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userAuth);
  // 2. Create initial todo using available SDK
  const todo = await api.functional.todoApp.user.todos.create(userConnection, {
    body: { title: "Analytics Test Todo" } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);
  // 3. Retrieve analytics for the created todo
  // Note: Analytics data depends on server-side completion/edit history tracking
  // The test validates the analytics structure and basic sanity checks
  const analytics = await api.functional.todoApp.user.todos.analytics(
    userConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(analytics);
  // 4. Validate analytics structure and basic sanity checks
  TestValidator.predicate(
    "total completions should be non-negative",
    analytics.completion_statistics.total_completions >= 0,
  );
  TestValidator.predicate(
    "completion rate should be valid probability",
    analytics.completion_statistics.completion_rate >= 0 &&
      analytics.completion_statistics.completion_rate <= 1,
  );
  TestValidator.predicate(
    "average completion time should be non-negative",
    analytics.completion_statistics.average_completion_time_minutes >= 0,
  );
  // 5. Validate edit history metrics structure
  TestValidator.predicate(
    "total edits should be non-negative",
    analytics.edit_history_metrics.total_edits >= 0,
  );
  TestValidator.predicate(
    "title changes should be non-negative",
    analytics.edit_history_metrics.field_change_counts.title_changes >= 0,
  );
  // 6. Validate timing insights
  TestValidator.equals(
    "creation time should match todo creation time",
    analytics.timing_insights.created_at,
    todo.created_at,
  );
  TestValidator.predicate(
    "time since creation should be non-negative",
    analytics.timing_insights.time_since_creation_minutes >= 0,
  );
  TestValidator.predicate(
    "completion frequency should be non-negative",
    analytics.timing_insights.completion_frequency_minutes >= 0,
  );
}
