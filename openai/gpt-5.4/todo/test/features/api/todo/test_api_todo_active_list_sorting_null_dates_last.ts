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

export async function test_api_todo_active_list_sorting_null_dates_last(
  connection: api.IConnection,
): Promise<void> {
  const joinPassword = "Password1234!";
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: joinPassword satisfies string as string &
        tags.Format<"password">,
      href: "https://example.com/todos/active",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMember = await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: joinPassword satisfies string as string &
        tags.Format<"password">,
      href: "https://example.com/todos/active",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(otherMember);
  const keyword = `sorting-null-dates-${RandomGenerator.alphaNumeric(8)}`;
  const startEarly = new Date("2026-01-01T09:00:00.000Z").toISOString();
  const startLate = new Date("2026-01-03T09:00:00.000Z").toISOString();
  const dueEarly = new Date("2026-02-01T09:00:00.000Z").toISOString();
  const dueLate = new Date("2026-02-03T09:00:00.000Z").toISOString();
  const todoWithEarlyDates = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: `${keyword}-alpha`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        startDate: startEarly,
        dueDate: dueLate,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoWithEarlyDates);
  const todoWithLateStart = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: `${keyword}-beta`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        startDate: startLate,
        dueDate: dueEarly,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoWithLateStart);
  const todoWithNullDates = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: `${keyword}-gamma`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoWithNullDates);
  const otherMemberTodo = await generate_random_todo_app_member_todos_create(
    otherMemberConnection,
    {
      body: {
        title: `${keyword}-outsider`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        startDate: new Date("2026-01-02T09:00:00.000Z").toISOString(),
        dueDate: new Date("2026-02-02T09:00:00.000Z").toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(otherMemberTodo);
  const expectedTodos: ITodoAppTodo[] = [
    todoWithEarlyDates,
    todoWithLateStart,
    todoWithNullDates,
  ];
  const expectedById = new Map<string, ITodoAppTodo>(
    expectedTodos.map((todo) => [todo.id, todo]),
  );
  const byStart = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        search: keyword,
        completed: "all",
        sort: "start_date_asc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(byStart);
  TestValidator.equals(
    "start-date page current matches request",
    byStart.pagination.current,
    1,
  );
  TestValidator.equals(
    "start-date page limit matches request",
    byStart.pagination.limit,
    10,
  );
  TestValidator.equals(
    "start-date result count contains only primary member active todos",
    byStart.data.length,
    expectedTodos.length,
  );
  TestValidator.equals(
    "start-date pagination records contains only primary member active todos",
    byStart.pagination.records,
    expectedTodos.length,
  );
  TestValidator.predicate(
    "start-date result reports at least one page when records exist",
    byStart.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "start-date page does not include outsider todo",
    byStart.data.every((todo) => todo.id !== otherMemberTodo.id),
  );
  byStart.data.forEach((summary) => {
    const expected = expectedById.get(summary.id);
    TestValidator.predicate(
      `start-date item belongs to prepared primary-member dataset: ${summary.id}`,
      expected !== undefined,
    );
    if (expected === undefined) return;
    TestValidator.equals(
      `start-date item title preserved: ${summary.id}`,
      summary.title,
      expected.title,
    );
    TestValidator.equals(
      `start-date item description preserved: ${summary.id}`,
      summary.description,
      expected.description,
    );
    TestValidator.equals(
      `start-date item start_date preserved: ${summary.id}`,
      summary.start_date,
      expected.start_date,
    );
    TestValidator.equals(
      `start-date item due_date preserved: ${summary.id}`,
      summary.due_date,
      expected.due_date,
    );
    TestValidator.equals(
      `start-date item completed preserved: ${summary.id}`,
      summary.completed,
      expected.completed,
    );
    TestValidator.equals(
      `start-date item completed_at preserved: ${summary.id}`,
      summary.completed_at,
      expected.completed_at,
    );
    TestValidator.equals(
      `start-date item created_at preserved: ${summary.id}`,
      summary.created_at,
      expected.created_at,
    );
    TestValidator.equals(
      `start-date item updated_at preserved: ${summary.id}`,
      summary.updated_at,
      expected.updated_at,
    );
    TestValidator.equals(
      `start-date item deleted_at preserved: ${summary.id}`,
      summary.deleted_at,
      expected.deleted_at,
    );
    TestValidator.equals(
      `start-date item is active: ${summary.id}`,
      summary.deleted_at,
      null,
    );
  });
  const startDates = byStart.data.map((todo) => todo.start_date);
  const firstNullStartIndex = startDates.findIndex((value) => value === null);
  TestValidator.predicate(
    "start-date null values are last",
    firstNullStartIndex === -1 ||
      startDates.slice(firstNullStartIndex).every((value) => value === null),
  );
  const nonNullStartDates = startDates.filter(
    (value): value is string & tags.Format<"date-time"> => value !== null,
  );
  TestValidator.predicate(
    "start-date non-null values are ascending",
    nonNullStartDates.every(
      (value, index) => index === 0 || nonNullStartDates[index - 1] <= value,
    ),
  );
  const byDue = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        search: keyword,
        completed: "all",
        sort: "due_date_asc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(byDue);
  TestValidator.equals(
    "due-date page current matches request",
    byDue.pagination.current,
    1,
  );
  TestValidator.equals(
    "due-date page limit matches request",
    byDue.pagination.limit,
    10,
  );
  TestValidator.equals(
    "due-date result count contains only primary member active todos",
    byDue.data.length,
    expectedTodos.length,
  );
  TestValidator.equals(
    "due-date pagination records contains only primary member active todos",
    byDue.pagination.records,
    expectedTodos.length,
  );
  TestValidator.predicate(
    "due-date result reports at least one page when records exist",
    byDue.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "due-date page does not include outsider todo",
    byDue.data.every((todo) => todo.id !== otherMemberTodo.id),
  );
  byDue.data.forEach((summary) => {
    const expected = expectedById.get(summary.id);
    TestValidator.predicate(
      `due-date item belongs to prepared primary-member dataset: ${summary.id}`,
      expected !== undefined,
    );
    if (expected === undefined) return;
    TestValidator.equals(
      `due-date item title preserved: ${summary.id}`,
      summary.title,
      expected.title,
    );
    TestValidator.equals(
      `due-date item description preserved: ${summary.id}`,
      summary.description,
      expected.description,
    );
    TestValidator.equals(
      `due-date item start_date preserved: ${summary.id}`,
      summary.start_date,
      expected.start_date,
    );
    TestValidator.equals(
      `due-date item due_date preserved: ${summary.id}`,
      summary.due_date,
      expected.due_date,
    );
    TestValidator.equals(
      `due-date item completed preserved: ${summary.id}`,
      summary.completed,
      expected.completed,
    );
    TestValidator.equals(
      `due-date item completed_at preserved: ${summary.id}`,
      summary.completed_at,
      expected.completed_at,
    );
    TestValidator.equals(
      `due-date item created_at preserved: ${summary.id}`,
      summary.created_at,
      expected.created_at,
    );
    TestValidator.equals(
      `due-date item updated_at preserved: ${summary.id}`,
      summary.updated_at,
      expected.updated_at,
    );
    TestValidator.equals(
      `due-date item deleted_at preserved: ${summary.id}`,
      summary.deleted_at,
      expected.deleted_at,
    );
    TestValidator.equals(
      `due-date item is active: ${summary.id}`,
      summary.deleted_at,
      null,
    );
  });
  const dueDates = byDue.data.map((todo) => todo.due_date);
  const firstNullDueIndex = dueDates.findIndex((value) => value === null);
  TestValidator.predicate(
    "due-date null values are last",
    firstNullDueIndex === -1 ||
      dueDates.slice(firstNullDueIndex).every((value) => value === null),
  );
  const nonNullDueDates = dueDates.filter(
    (value): value is string & tags.Format<"date-time"> => value !== null,
  );
  TestValidator.predicate(
    "due-date non-null values are ascending",
    nonNullDueDates.every(
      (value, index) => index === 0 || nonNullDueDates[index - 1] <= value,
    ),
  );
}
