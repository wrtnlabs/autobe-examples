import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

/**
 * Test sorting options and date range filtering for todo items.
 * 1. Register member and create todos with various dates
 * 2. Test sorting by created_at, start_date, due_date
 * 3. Test date range filtering for start_date and due_date
 * 4. Verify todos without dates appear at end when sorting by that field
 */
export async function test_api_todo_list_sorting_and_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  // 2. Create todos with various dates
  const todo1 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Todo without dates",
        start_date: null,
        due_date: null,
      },
    },
  );
  typia.assert(todo1);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const todo2 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Todo with early start date",
        start_date: new Date(now.getTime() - oneDayMs * 2).toISOString(),
        due_date: new Date(now.getTime() + oneDayMs).toISOString(),
      },
    },
  );
  typia.assert(todo2);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const todo3 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Todo with late start date",
        start_date: new Date(now.getTime() + oneDayMs * 5).toISOString(),
        due_date: new Date(now.getTime() + oneDayMs * 10).toISOString(),
      },
    },
  );
  typia.assert(todo3);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const todo4 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Todo without start date but with due date",
        start_date: null,
        due_date: new Date(now.getTime() + oneDayMs * 3).toISOString(),
      },
    },
  );
  typia.assert(todo4);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const todo5 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Todo without due date but with start date",
        start_date: new Date(now.getTime() + oneDayMs * 7).toISOString(),
        due_date: null,
      },
    },
  );
  typia.assert(todo5);
  // 3. Test sorting by created_at (newest first)
  const sortedByCreatedAt =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(sortedByCreatedAt);
  TestValidator.equals(
    "created_at desc - newest first",
    sortedByCreatedAt.data[0].id,
    todo5.id,
  );
  TestValidator.equals(
    "created_at desc - oldest last",
    sortedByCreatedAt.data[sortedByCreatedAt.data.length - 1].id,
    todo1.id,
  );
  // 4. Test sorting by start_date (earliest first)
  const sortedByStartDate =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: {
        sortBy: "start_date",
        sortOrder: "asc",
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(sortedByStartDate);
  TestValidator.equals(
    "start_date asc - earliest first",
    sortedByStartDate.data[0].start_date,
    todo2.start_date,
  );
  const todosWithoutStartDate = sortedByStartDate.data.filter(
    (t) => t.start_date === null,
  );
  TestValidator.predicate(
    "todos without start_date at end",
    todosWithoutStartDate.every(
      (t) =>
        sortedByStartDate.data.indexOf(t) >=
        sortedByStartDate.data.length - todosWithoutStartDate.length,
    ),
  );
  // 5. Test sorting by due_date (earliest first)
  const sortedByDueDate = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        sortBy: "due_date",
        sortOrder: "asc",
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(sortedByDueDate);
  TestValidator.equals(
    "due_date asc - earliest first",
    sortedByDueDate.data[0].due_date,
    todo2.due_date,
  );
  const todosWithoutDueDate = sortedByDueDate.data.filter(
    (t) => t.due_date === null,
  );
  TestValidator.predicate(
    "todos without due_date at end",
    todosWithoutDueDate.every(
      (t) =>
        sortedByDueDate.data.indexOf(t) >=
        sortedByDueDate.data.length - todosWithoutDueDate.length,
    ),
  );
  // 6. Test date range filtering by start_date
  const startDateFrom = new Date(now.getTime() - oneDayMs).toISOString();
  const startDateTo = new Date(now.getTime() + oneDayMs * 6).toISOString();
  const filteredByStartDate =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: {
        startDateFrom,
        startDateTo,
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(filteredByStartDate);
  TestValidator.predicate(
    "start_date filter - all within range",
    filteredByStartDate.data.every(
      (t) =>
        t.start_date !== null &&
        t.start_date !== undefined &&
        t.start_date >= startDateFrom &&
        t.start_date <= startDateTo,
    ),
  );
  TestValidator.equals(
    "start_date filter - count matches",
    filteredByStartDate.data.length,
    3,
  );
  // 7. Test date range filtering by due_date
  const dueDateFrom = new Date(now.getTime() + oneDayMs).toISOString();
  const dueDateTo = new Date(now.getTime() + oneDayMs * 11).toISOString();
  const filteredByDueDate =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: {
        dueDateFrom,
        dueDateTo,
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(filteredByDueDate);
  TestValidator.predicate(
    "due_date filter - all within range",
    filteredByDueDate.data.every(
      (t) =>
        t.due_date !== null &&
        t.due_date !== undefined &&
        t.due_date >= dueDateFrom &&
        t.due_date <= dueDateTo,
    ),
  );
  TestValidator.equals(
    "due_date filter - count matches",
    filteredByDueDate.data.length,
    3,
  );
}