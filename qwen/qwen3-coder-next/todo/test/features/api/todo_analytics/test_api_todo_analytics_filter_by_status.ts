import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIScheduledTodoActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIScheduledTodoActivity";
import type { IScheduledTodoActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IScheduledTodoActivity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_analytics_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create multiple todos with different completion states
  const todo1 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo 1",
        description: "Todo 1 description",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  const todo2 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo 2",
        description: "Todo 2 description",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  // Mark first todo as complete
  await api.functional.todoApp.member.todos.toggle_complete.toggleComplete(
    memberConnection,
    {
      todoId: todo1.id,
      body: { is_complete: true } satisfies ITodoAppTodo.IToggleComplete,
    },
  );
  // 3. Get analytics with status='complete'
  const analytics =
    await api.functional.todoApp.member.analytics.activities.index(
      memberConnection,
      {
        body: {
          status: "complete",
          limit: 10,
          offset: 0,
        } satisfies IScheduledTodoActivity.IRequest,
      },
    );
  typia.assert(analytics);
  // 4. Validate results
  // All returned activities should be related to completed todos
  analytics.data.forEach((activity) => {
    TestValidator.equals(
      "activity type is completed",
      activity.activity_type,
      "completed",
    );
    TestValidator.predicate("count is non-negative", activity.count >= 0);
  });
  // Validate pagination structure
  TestValidator.equals("pagination current", analytics.pagination.current, 1);
  TestValidator.predicate("pagination limit", analytics.pagination.limit > 0);
  TestValidator.predicate(
    "pagination records >= 0",
    analytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    analytics.pagination.pages >= 0,
  );
}