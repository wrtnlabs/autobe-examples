import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
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

export async function test_api_todo_list_sorting_with_null_dates(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // Step 2: Create reference dates (earliest to latest)
  const now = new Date();
  const day0 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const day1 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const day2 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  // Step 3: Create todos with varied date configurations
  // Todo 1: startDate=day0 (earliest), dueDate=day0 (earliest)
  const todo1 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo 1",
        start_date: day0.toISOString(),
        due_date: day0.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  // Todo 2: startDate=day1, no dueDate
  const todo2 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo 2",
        start_date: day1.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  // Todo 3: no startDate, dueDate=day1
  const todo3 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo 3",
        due_date: day1.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo3);
  // Todo 4: startDate=day2 (latest non-null), dueDate=day2 (latest non-null)
  const todo4 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo 4",
        start_date: day2.toISOString(),
        due_date: day2.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo4);
  // Todo 5: no startDate, no dueDate
  const todo5 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo 5",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo5);
  // Step 4: Test sorting by createdAt asc
  const todosCreatedAtAsc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sortBy: "createdAt",
        sortOrder: "asc",
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(todosCreatedAtAsc);
  TestValidator.equals(
    "createdAt asc order",
    todosCreatedAtAsc.data.map((t) => t.id),
    [todo1.id, todo2.id, todo3.id, todo4.id, todo5.id],
  );
  // Step 5: Test sorting by createdAt desc
  const todosCreatedAtDesc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sortBy: "createdAt",
        sortOrder: "desc",
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(todosCreatedAtDesc);
  TestValidator.equals(
    "createdAt desc order",
    todosCreatedAtDesc.data.map((t) => t.id),
    [todo5.id, todo4.id, todo3.id, todo2.id, todo1.id],
  );
  // Step 6: Test sorting by startDate asc (nulls last)
  const todosStartDateAsc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sortBy: "startDate",
        sortOrder: "asc",
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(todosStartDateAsc);
  // Expected: todo1(day0), todo2(day1), todo4(day2), then nulls: todo3, todo5
  TestValidator.equals(
    "startDate asc order (nulls last)",
    todosStartDateAsc.data.map((t) => t.id),
    [todo1.id, todo2.id, todo4.id, todo3.id, todo5.id],
  );
  // Step 7: Test sorting by startDate desc (nulls last)
  const todosStartDateDesc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sortBy: "startDate",
        sortOrder: "desc",
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(todosStartDateDesc);
  // Expected: todo4(day2), todo2(day1), todo1(day0), then nulls: todo3, todo5
  TestValidator.equals(
    "startDate desc order (nulls last)",
    todosStartDateDesc.data.map((t) => t.id),
    [todo4.id, todo2.id, todo1.id, todo3.id, todo5.id],
  );
  // Step 8: Test sorting by dueDate asc (nulls last)
  const todosDueDateAsc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sortBy: "dueDate",
        sortOrder: "asc",
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(todosDueDateAsc);
  // Expected: todo1(day0), todo3(day1), todo4(day2), then nulls: todo2, todo5
  TestValidator.equals(
    "dueDate asc order (nulls last)",
    todosDueDateAsc.data.map((t) => t.id),
    [todo1.id, todo3.id, todo4.id, todo2.id, todo5.id],
  );
  // Step 9: Test sorting by dueDate desc (nulls last)
  const todosDueDateDesc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sortBy: "dueDate",
        sortOrder: "desc",
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(todosDueDateDesc);
  // Expected: todo4(day2), todo3(day1), todo1(day0), then nulls: todo2, todo5
  TestValidator.equals(
    "dueDate desc order (nulls last)",
    todosDueDateDesc.data.map((t) => t.id),
    [todo4.id, todo3.id, todo1.id, todo2.id, todo5.id],
  );
}
