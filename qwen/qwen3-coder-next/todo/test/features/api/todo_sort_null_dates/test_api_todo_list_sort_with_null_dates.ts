import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
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

export async function test_api_todo_list_sort_with_null_dates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(member);
  // 2. Create four groups of todos with different date configurations
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  // Group 1: Todos with both start_date and due_date
  const todo1 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo with both dates",
        start_date: yesterday.toISOString(),
        due_date: tomorrow.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  const todo2 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo with both dates - earlier start",
        start_date: yesterday.toISOString(),
        due_date: now.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  // Group 2: Todos without start_date but with due_date
  const todo3 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo with due_date only",
        due_date: tomorrow.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo3);
  const todo4 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo with due_date only - earlier",
        due_date: now.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo4);
  // Group 3: Todos without due_date but with start_date
  const todo5 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo with start_date only",
        start_date: now.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo5);
  const todo6 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo with start_date only - earlier",
        start_date: yesterday.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo6);
  // Group 4: Todos without either date field
  const todo7 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo with no dates",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo7);
  const todo8 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo with no dates - second",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo8);
  // 3. Test sorting by start_date ascending
  const sortedByStartDateAsc: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        is_complete: "all",
        sort_by: "start_date",
        sort_order: "asc",
        limit: 100,
        offset: 0,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(sortedByStartDateAsc);
  TestValidator.equals(
    "todos sorted by start_date ascending",
    sortedByStartDateAsc.data.length,
    8,
  );
  // 4. Test sorting by start_date descending
  const sortedByStartDateDesc: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        is_complete: "all",
        sort_by: "start_date",
        sort_order: "desc",
        limit: 100,
        offset: 0,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(sortedByStartDateDesc);
  TestValidator.equals(
    "todos sorted by start_date descending",
    sortedByStartDateDesc.data.length,
    8,
  );
  // 5. Test sorting by due_date ascending
  const sortedByDueDateAsc: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        is_complete: "all",
        sort_by: "due_date",
        sort_order: "asc",
        limit: 100,
        offset: 0,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(sortedByDueDateAsc);
  TestValidator.equals(
    "todos sorted by due_date ascending",
    sortedByDueDateAsc.data.length,
    8,
  );
  // 6. Test sorting by due_date descending
  const sortedByDueDateDesc: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        is_complete: "all",
        sort_by: "due_date",
        sort_order: "desc",
        limit: 100,
        offset: 0,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(sortedByDueDateDesc);
  TestValidator.equals(
    "todos sorted by due_date descending",
    sortedByDueDateDesc.data.length,
    8,
  );
}
