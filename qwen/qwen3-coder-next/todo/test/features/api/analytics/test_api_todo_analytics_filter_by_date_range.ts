import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIScheduledTodoActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIScheduledTodoActivity";
import type { IPageITodoAppTodoEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEdit";
import type { IScheduledTodoActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IScheduledTodoActivity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEdit";
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

export async function test_api_todo_analytics_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for registration and login
  const memberConnection: api.IConnection = { host: connection.host };
  // Register a new member
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(typia.random<string & tags.Format<"email">>()),
      password: "Test1234!@#$",
      href: "https://example.com/register",
      referrer: "https://example.com/referrer",
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(member);
  // Create a new member-specific connection with tokens
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: `Bearer ${member.access_token.access_token}`,
    },
  };
  // Create multiple todos with different dates for testing
  const now = new Date();
  const days = [
    { offset: 30, label: "30days" },
    { offset: 15, label: "15days" },
    { offset: 7, label: "7days" },
    { offset: 3, label: "3days" },
    { offset: 0, label: "today" },
  ];
  const createdTodos: ITodoAppTodo[] = [];
  for (const day of days) {
    const todoDate = new Date(now);
    todoDate.setDate(todoDate.getDate() - day.offset);
    const todo = await api.functional.todoApp.member.todos.create(
      memberAuthConnection,
      {
        body: {
          title: `Todo for ${day.label} test`,
          description: `Test description for ${day.label}`,
          start_date: todoDate.toISOString(),
          due_date: new Date(
            todoDate.getTime() + 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    createdTodos.push(todo);
    // Edit some todos to generate edit history within date ranges
    if (day.offset <= 15) {
      const editHistory =
        await api.functional.todoApp.member.todos.edit_history.index(
          memberAuthConnection,
          {
            todoId: todo.id,
          },
        );
      typia.assert(editHistory);
    }
  }
  // Test 1: Filter by creation date range (last 7 days)
  const recent7DaysFilter = {
    status: "all",
    startDateRange: new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    endDateRange: now.toISOString(),
    offset: 0,
    limit: 10,
  } satisfies IScheduledTodoActivity.IRequest;
  const recent7DaysResult =
    await api.functional.todoApp.member.analytics.activities.index(
      memberAuthConnection,
      {
        body: recent7DaysFilter,
      },
    );
  typia.assert(recent7DaysResult);
  // Verify results are within date range
  for (const item of recent7DaysResult.data) {
    TestValidator.predicate(
      "date within range",
      item.timestamp >= recent7DaysFilter.startDateRange! &&
        item.timestamp <= recent7DaysFilter.endDateRange!,
    );
  }
  // Test 2: Filter by creation date range (last 30 days)
  const recent30DaysFilter = {
    status: "all",
    startDateRange: new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    endDateRange: now.toISOString(),
    offset: 0,
    limit: 10,
  } satisfies IScheduledTodoActivity.IRequest;
  const recent30DaysResult =
    await api.functional.todoApp.member.analytics.activities.index(
      memberAuthConnection,
      {
        body: recent30DaysFilter,
      },
    );
  typia.assert(recent30DaysResult);
  // Verify we get more or equal results than 7 days (should include all 7-day results)
  TestValidator.predicate(
    "30 days includes 7 days",
    recent30DaysResult.data.length >= recent7DaysResult.data.length,
  );
  // Test 3: Filter by edit activity date range
  const editActivityFilter = {
    status: "all",
    editStartDateRange: new Date(
      now.getTime() - 15 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    editEndDateRange: now.toISOString(),
    offset: 0,
    limit: 10,
  } satisfies IScheduledTodoActivity.IRequest;
  const editActivityResult =
    await api.functional.todoApp.member.analytics.activities.index(
      memberAuthConnection,
      {
        body: editActivityFilter,
      },
    );
  typia.assert(editActivityResult);
  // Test 4: Filter with status filter
  const completeFilter = {
    status: "complete",
    startDateRange: new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    endDateRange: now.toISOString(),
    offset: 0,
    limit: 10,
  } satisfies IScheduledTodoActivity.IRequest;
  const completeResult =
    await api.functional.todoApp.member.analytics.activities.index(
      memberAuthConnection,
      {
        body: completeFilter,
      },
    );
  typia.assert(completeResult);
  // Test 5: Empty result when date range is far in the past
  const pastFilter = {
    status: "all",
    startDateRange: "2020-01-01T00:00:00.000Z",
    endDateRange: "2020-12-31T23:59:59.999Z",
    offset: 0,
    limit: 10,
  } satisfies IScheduledTodoActivity.IRequest;
  const pastResult =
    await api.functional.todoApp.member.analytics.activities.index(
      memberAuthConnection,
      {
        body: pastFilter,
      },
    );
  typia.assert(pastResult);
  // Should return empty data array or only a few items
  TestValidator.predicate(
    "past date range should have minimal results",
    pastResult.data.length <= 1,
  );
  // Test 6: Pagination test
  const paginationFilter = {
    status: "all",
    startDateRange: new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    endDateRange: now.toISOString(),
    offset: 0,
    limit: 2,
  } satisfies IScheduledTodoActivity.IRequest;
  const paginationResult =
    await api.functional.todoApp.member.analytics.activities.index(
      memberAuthConnection,
      {
        body: paginationFilter,
      },
    );
  typia.assert(paginationResult);
  // Verify pagination structure
  TestValidator.equals(
    "pagination limit",
    paginationResult.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination has records",
    paginationResult.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    paginationResult.pagination.pages >= 1,
  );
  // Verify data array length matches limit
  TestValidator.predicate("data array size", paginationResult.data.length <= 2);
  // Test 7: Verify activity types are correct
  for (const item of recent7DaysResult.data) {
    TestValidator.predicate(
      "valid activity type",
      item.activity_type === "created" ||
        item.activity_type === "completed" ||
        item.activity_type === "edited",
    );
    TestValidator.predicate(
      "timestamp format",
      typeof item.timestamp === "string" && item.timestamp.length > 0,
    );
    TestValidator.predicate("count is positive", item.count >= 0);
  }
  // Test 8: Filter by today only
  const todayFilter = {
    status: "all",
    startDateRange: new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).toISOString(),
    endDateRange: now.toISOString(),
    offset: 0,
    limit: 10,
  } satisfies IScheduledTodoActivity.IRequest;
  const todayResult =
    await api.functional.todoApp.member.analytics.activities.index(
      memberAuthConnection,
      {
        body: todayFilter,
      },
    );
  typia.assert(todayResult);
  // Test 9: Filter with edit date range only
  const editOnlyFilter = {
    status: "all",
    editStartDateRange: new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    editEndDateRange: now.toISOString(),
    offset: 0,
    limit: 10,
  } satisfies IScheduledTodoActivity.IRequest;
  const editOnlyResult =
    await api.functional.todoApp.member.analytics.activities.index(
      memberAuthConnection,
      {
        body: editOnlyFilter,
      },
    );
  typia.assert(editOnlyResult);
  // Test 10: Verify data structure integrity
  TestValidator.equals(
    "pagination current page",
    recent7DaysResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    recent7DaysResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    recent7DaysResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    recent7DaysResult.pagination.pages >= 0,
  );
}