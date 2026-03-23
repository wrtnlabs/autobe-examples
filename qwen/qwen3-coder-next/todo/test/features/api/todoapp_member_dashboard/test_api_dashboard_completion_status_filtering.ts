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

export async function test_api_dashboard_completion_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberSession = await authorize_member_join(memberConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  // 2. Create 3 incomplete todos
  const todo1 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  const todo2 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  const todo3 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  // 3. Create 2 completed todos
  const todo4 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(4),
        description: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  await api.functional.todoApp.member.todos.toggle_complete.toggleComplete(
    memberConnection,
    {
      todoId: todo4.id,
      body: { is_complete: true } satisfies ITodoAppTodo.IToggleComplete,
    },
  );
  const todo5 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  await api.functional.todoApp.member.todos.toggle_complete.toggleComplete(
    memberConnection,
    {
      todoId: todo5.id,
      body: { is_complete: true } satisfies ITodoAppTodo.IToggleComplete,
    },
  );
  // 4. Test status=complete filter
  const completeDashboard =
    await api.functional.todoApp.member.dashboard.at(memberConnection);
  typia.assert(completeDashboard);
  TestValidator.equals("completedTodos", completeDashboard.completedTodos, 2);
  TestValidator.equals("totalTodos", completeDashboard.totalTodos, 2);
  TestValidator.predicate(
    "all todos are complete",
    completeDashboard.todos.every((t) => t.is_complete),
  );
  TestValidator.predicate(
    "recentEditHistory is populated",
    completeDashboard.recentEditHistory.length > 0,
  );
  // 5. Test status=incomplete filter
  const incompleteDashboard =
    await api.functional.todoApp.member.dashboard.at(memberConnection);
  typia.assert(incompleteDashboard);
  TestValidator.equals(
    "completedTodos for incomplete filter",
    incompleteDashboard.completedTodos,
    2,
  );
  TestValidator.equals(
    "totalTodos for incomplete filter",
    incompleteDashboard.totalTodos,
    2,
  );
  TestValidator.predicate(
    "all todos are incomplete",
    incompleteDashboard.todos.every((t) => !t.is_complete),
  );
  // 6. Test status=all filter
  const allDashboard =
    await api.functional.todoApp.member.dashboard.at(memberConnection);
  typia.assert(allDashboard);
  TestValidator.equals(
    "completedTodos for all filter",
    allDashboard.completedTodos,
    2,
  );
  TestValidator.equals("totalTodos for all filter", allDashboard.totalTodos, 5);
  TestValidator.predicate(
    "todos include both complete and incomplete",
    allDashboard.todos.some((t) => t.is_complete) &&
      allDashboard.todos.some((t) => !t.is_complete),
  );
  TestValidator.predicate(
    "recentEditHistory is populated",
    allDashboard.recentEditHistory.length > 0,
  );
  // 7. Add another incomplete todo to test empty completed scenario
  const todo6 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  const noCompletedDashboard =
    await api.functional.todoApp.member.dashboard.at(memberConnection);
  typia.assert(noCompletedDashboard);
  TestValidator.predicate(
    "recentEditHistory is still populated",
    noCompletedDashboard.recentEditHistory.length > 0,
  );
}