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

export async function test_api_todo_list_sort_null_dates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create todos with various date configurations
  const now = new Date();
  const baseTime = now.getTime();
  // Todo with both dates set
  const todoBothDates = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Todo with both dates",
        startDate: new Date(baseTime + 1000 * 60 * 60 * 24).toISOString(),
        dueDate: new Date(baseTime + 1000 * 60 * 60 * 48).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoBothDates);
  // Todo with only start_date
  const todoOnlyStart = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Todo with only start date",
        startDate: new Date(baseTime + 1000 * 60 * 60 * 12).toISOString(),
        dueDate: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoOnlyStart);
  // Todo with only due_date
  const todoOnlyDue = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Todo with only due date",
        startDate: null,
        dueDate: new Date(baseTime + 1000 * 60 * 60 * 72).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoOnlyDue);
  // Todo with neither date
  const todoNoDates = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Todo with no dates",
        startDate: null,
        dueDate: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoNoDates);
  // Another todo with both dates (earlier)
  const todoBothDatesEarly = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Todo with both dates early",
        startDate: new Date(baseTime + 1000 * 60 * 60 * 6).toISOString(),
        dueDate: new Date(baseTime + 1000 * 60 * 60 * 24).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoBothDatesEarly);
  // 3. Test sorting by start_date ascending - NULL values at the end
  const sortByStartDateAsc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort_field: "start_date",
        sort_direction: "asc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortByStartDateAsc);
  // Verify NULL start_date values are at the end
  const startDatesAsc = sortByStartDateAsc.data.map((t) => t.start_date);
  const nullStartCountAsc = startDatesAsc.filter((d) => d === null).length;
  const nonNullStartCountAsc = startDatesAsc.filter((d) => d !== null).length;
  // All non-null should come before nulls
  const firstNullIndexAsc = startDatesAsc.findIndex((d) => d === null);
  const lastNonNullIndexAsc = startDatesAsc.reduce(
    (lastIdx, d, idx) => (d !== null ? idx : lastIdx),
    -1,
  );
  TestValidator.predicate(
    "start_date asc: nulls at end",
    firstNullIndexAsc === -1 || firstNullIndexAsc > lastNonNullIndexAsc,
  );
  TestValidator.equals("start_date asc: null count", nullStartCountAsc, 2);
  TestValidator.equals(
    "start_date asc: non-null count",
    nonNullStartCountAsc,
    3,
  );
  // 4. Test sorting by start_date descending - NULL values still at the end
  const sortByStartDateDesc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort_field: "start_date",
        sort_direction: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortByStartDateDesc);
  const startDatesDesc = sortByStartDateDesc.data.map((t) => t.start_date);
  const firstNullIndexDesc = startDatesDesc.findIndex((d) => d === null);
  const lastNonNullIndexDesc = startDatesDesc.reduce(
    (lastIdx, d, idx) => (d !== null ? idx : lastIdx),
    -1,
  );
  TestValidator.predicate(
    "start_date desc: nulls at end",
    firstNullIndexDesc === -1 || firstNullIndexDesc > lastNonNullIndexDesc,
  );
  // 5. Test sorting by due_date ascending - NULL values at the end
  const sortByDueDateAsc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort_field: "due_date",
        sort_direction: "asc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortByDueDateAsc);
  const dueDatesAsc = sortByDueDateAsc.data.map((t) => t.due_date);
  const nullDueCountAsc = dueDatesAsc.filter((d) => d === null).length;
  const nonNullDueCountAsc = dueDatesAsc.filter((d) => d !== null).length;
  const firstNullDueIndexAsc = dueDatesAsc.findIndex((d) => d === null);
  const lastNonNullDueIndexAsc = dueDatesAsc.reduce(
    (lastIdx, d, idx) => (d !== null ? idx : lastIdx),
    -1,
  );
  TestValidator.predicate(
    "due_date asc: nulls at end",
    firstNullDueIndexAsc === -1 ||
      firstNullDueIndexAsc > lastNonNullDueIndexAsc,
  );
  TestValidator.equals("due_date asc: null count", nullDueCountAsc, 2);
  TestValidator.equals("due_date asc: non-null count", nonNullDueCountAsc, 3);
  // 6. Test sorting by due_date descending - NULL values still at the end
  const sortByDueDateDesc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort_field: "due_date",
        sort_direction: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortByDueDateDesc);
  const dueDatesDesc = sortByDueDateDesc.data.map((t) => t.due_date);
  const firstNullDueIndexDesc = dueDatesDesc.findIndex((d) => d === null);
  const lastNonNullDueIndexDesc = dueDatesDesc.reduce(
    (lastIdx, d, idx) => (d !== null ? idx : lastIdx),
    -1,
  );
  TestValidator.predicate(
    "due_date desc: nulls at end",
    firstNullDueIndexDesc === -1 ||
      firstNullDueIndexDesc > lastNonNullDueIndexDesc,
  );
  // 7. Test default sorting by created_at
  const sortByCreatedAt = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort_field: "created_at",
        sort_direction: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortByCreatedAt);
  TestValidator.equals(
    "created_at sort total records",
    sortByCreatedAt.pagination.records,
    5,
  );
  // 8. Verify pagination metadata is correct
  TestValidator.equals(
    "start_date asc pagination total",
    sortByStartDateAsc.pagination.records,
    5,
  );
  TestValidator.equals(
    "due_date asc pagination total",
    sortByDueDateAsc.pagination.records,
    5,
  );
}
