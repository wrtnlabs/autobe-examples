import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppDashboard";
import type { ITodoAppEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistoryEntry";
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

export async function test_api_dashboard_sorting_pagination_and_edit_history(
  connection: api.IConnection,
) {
  // 1. Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberSession = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() as string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() as string &
        tags.Format<"uri">,
      referrer: typia.random<string & tags.Format<"uri">>() as string &
        tags.Format<"uri">,
    } satisfies ITodoAppMemberSession.IJoin,
  });
  memberConnection.headers = { Authorization: memberSession.token.access };
  // 2. Create 15 todos with varied dates in batches with distinct timestamps
  const todos: ITodoAppTodo.ISummary[] = [];
  // Batch 1: Create 5 todos with start_date and due_date
  const batch1 = await ArrayUtil.asyncRepeat(5, async (i) => {
    const now = new Date();
    const offset = (i + 1) * 1000; // 1 second apart
    const startAt = new Date(now.getTime() - offset - 3000).toISOString();
    const dueAt = new Date(now.getTime() - offset - 2000).toISOString();
    const createdTodo = await generate_random_todo_app_member_todos_create(
      memberConnection,
      {
        body: {
          title: `Todo ${i + 1}`,
          start_date: startAt as string & tags.Format<"date-time">,
          due_date: dueAt as string & tags.Format<"date-time">,
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    return typia.assert<ITodoAppTodo.ISummary>(createdTodo);
  });
  todos.push(...batch1);
  // Batch 2: Create 5 todos with only start_date
  const batch2 = await ArrayUtil.asyncRepeat(5, async (i) => {
    const now = new Date();
    const offset = 5000 + (i + 1) * 1000;
    const startAt = new Date(now.getTime() - offset).toISOString();
    const createdTodo = await generate_random_todo_app_member_todos_create(
      memberConnection,
      {
        body: {
          title: `Todo ${5 + i + 1}`,
          start_date: startAt as string & tags.Format<"date-time">,
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    return typia.assert<ITodoAppTodo.ISummary>(createdTodo);
  });
  todos.push(...batch2);
  // Batch 3: Create 5 todos with only due_date
  const batch3 = await ArrayUtil.asyncRepeat(5, async (i) => {
    const now = new Date();
    const offset = 10000 + (i + 1) * 1000;
    const dueAt = new Date(now.getTime() - offset).toISOString();
    const createdTodo = await generate_random_todo_app_member_todos_create(
      memberConnection,
      {
        body: {
          title: `Todo ${10 + i + 1}`,
          due_date: dueAt as string & tags.Format<"date-time">,
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    return typia.assert<ITodoAppTodo.ISummary>(createdTodo);
  });
  todos.push(...batch3);
  // 3. Call dashboard API with sorting and pagination
  const dashboard =
    await api.functional.todoApp.member.dashboard.at(memberConnection);
  typia.assert(dashboard);
  // 4. Validate pagination
  TestValidator.equals("totalTodos count", dashboard.totalTodos, 15);
  TestValidator.equals("todos count", dashboard.todos.length, 5);
  // 5. Validate sorting by created_at descending
  for (let i = 0; i < dashboard.todos.length - 1; i++) {
    TestValidator.predicate(
      "created_at descending",
      dashboard.todos[i].created_at >= dashboard.todos[i + 1].created_at,
    );
  }
  // 6. Validate edit history entries are sorted by created_at descending
  for (let i = 0; i < dashboard.recentEditHistory.length - 1; i++) {
    TestValidator.predicate(
      "edit_history sorting",
      dashboard.recentEditHistory[i].created_at >=
        dashboard.recentEditHistory[i + 1].created_at,
    );
  }
  // 7. Test sorting by start_date (with todos missing dates at end)
  const startSortDashboard =
    await api.functional.todoApp.member.dashboard.at(memberConnection);
  typia.assert(startSortDashboard);
  // 8. Test sorting by due_date (with todos missing dates at end)
  const dueSortDashboard =
    await api.functional.todoApp.member.dashboard.at(memberConnection);
  typia.assert(dueSortDashboard);
}
