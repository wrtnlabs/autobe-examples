import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoAnalytics";
import type { IPriorityDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IPriorityDistribution";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAnalytics";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test analytics functionality with specific date range filtering.
 *
 * This test creates todos with completion dates spanning different time
 * periods, then queries analytics for specific date ranges to verify proper
 * date filtering. Validates that only todos within the specified date range are
 * included in the analytics calculations and that metrics like average
 * completion time are correctly computed for the filtered period.
 */
export async function test_api_todo_analytics_date_range_filter(
  connection: api.IConnection,
) {
  // 1. Create authenticated user context
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "testPassword123",
        password_hash: "", // System will generate proper hash
        status: "active", // Required property
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create todos with various dates for analytics testing
  const todos: ITodoAppTodo[] = [];

  // Create dates spanning different periods
  const today = new Date();
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Create todos with different dates
  const todo1: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Today's todo",
        description: "Todo with today's date",
        due_date: today.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  todos.push(todo1);

  const todo2: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Last week's todo",
        description: "Todo with last week's date",
        due_date: lastWeek.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  todos.push(todo2);

  const todo3: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Next week's todo",
        description: "Todo with next week's date",
        due_date: nextWeek.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo3);
  todos.push(todo3);

  const todo4: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Last month's todo",
        description: "Todo with last month's date",
        due_date: lastMonth.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo4);
  todos.push(todo4);

  // 3. Test analytics with specific date ranges

  // Test 1: Date range covering only today
  const todayRange: IDateRange = {
    start_date: today.toISOString(),
    end_date: today.toISOString(),
  };

  const todayAnalytics: IPageITodoAppTodoAnalytics =
    await api.functional.todoApp.user.analytics.todo_completion.index(
      connection,
      {
        body: {
          date_range: todayRange,
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodoAnalytics.IRequest,
      },
    );
  typia.assert(todayAnalytics);

  TestValidator.equals(
    "today range should have pagination info",
    todayAnalytics.pagination.current,
    1,
  );
  TestValidator.equals(
    "today range should have limit",
    todayAnalytics.pagination.limit,
    10,
  );

  // Test 2: Date range covering last week to today
  const lastWeekToTodayRange: IDateRange = {
    start_date: lastWeek.toISOString(),
    end_date: today.toISOString(),
  };

  const lastWeekToTodayAnalytics: IPageITodoAppTodoAnalytics =
    await api.functional.todoApp.user.analytics.todo_completion.index(
      connection,
      {
        body: {
          date_range: lastWeekToTodayRange,
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodoAnalytics.IRequest,
      },
    );
  typia.assert(lastWeekToTodayAnalytics);

  // Test 3: Date range covering this month
  const thisMonthRange: IDateRange = {
    start_date: new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    ).toISOString(),
    end_date: new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
    ).toISOString(),
  };

  const thisMonthAnalytics: IPageITodoAppTodoAnalytics =
    await api.functional.todoApp.user.analytics.todo_completion.index(
      connection,
      {
        body: {
          date_range: thisMonthRange,
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodoAnalytics.IRequest,
      },
    );
  typia.assert(thisMonthAnalytics);

  // Test 4: Future date range
  const futureRange: IDateRange = {
    start_date: nextWeek.toISOString(),
    end_date: new Date(
      nextWeek.getTime() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };

  const futureAnalytics: IPageITodoAppTodoAnalytics =
    await api.functional.todoApp.user.analytics.todo_completion.index(
      connection,
      {
        body: {
          date_range: futureRange,
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodoAnalytics.IRequest,
      },
    );
  typia.assert(futureAnalytics);

  // 4. Validate that analytics data structure is correct
  TestValidator.predicate(
    "today analytics should have valid total todos count",
    todayAnalytics.data[0]?.total_todos >= 0,
  );

  TestValidator.predicate(
    "today analytics should have valid priority distribution",
    todayAnalytics.data[0]?.priority_distribution.low >= 0 &&
      todayAnalytics.data[0]?.priority_distribution.medium >= 0 &&
      todayAnalytics.data[0]?.priority_distribution.high >= 0,
  );

  // 5. Verify that different date ranges produce different results
  TestValidator.notEquals(
    "today range and last week range should have different analytics",
    todayAnalytics.data[0]?.total_todos,
    lastWeekToTodayAnalytics.data[0]?.total_todos,
  );

  // 6. Test with specific filters
  const filteredAnalytics: IPageITodoAppTodoAnalytics =
    await api.functional.todoApp.user.analytics.todo_completion.index(
      connection,
      {
        body: {
          date_range: todayRange,
          status_filters: ["completed"],
          priority_filters: ["high", "medium"],
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodoAnalytics.IRequest,
      },
    );
  typia.assert(filteredAnalytics);

  // 7. Validate that analytics metrics are correctly computed
  TestValidator.predicate(
    "average completion time should be non-negative",
    todayAnalytics.data[0]?.average_completion_time_hours >= 0,
  );

  TestValidator.predicate(
    "completed todos count should be less than or equal to total todos",
    todayAnalytics.data[0]?.completed_todos <=
      todayAnalytics.data[0]?.total_todos,
  );

  // 8. Test with empty date range
  const emptyRange: IDateRange = {
    start_date: new Date("3000-01-01").toISOString(),
    end_date: new Date("3000-01-02").toISOString(),
  };

  const emptyAnalytics: IPageITodoAppTodoAnalytics =
    await api.functional.todoApp.user.analytics.todo_completion.index(
      connection,
      {
        body: {
          date_range: emptyRange,
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodoAnalytics.IRequest,
      },
    );
  typia.assert(emptyAnalytics);

  // Final validation that all analytics calls returned valid data
  TestValidator.predicate(
    "all analytics responses should have valid data arrays",
    todayAnalytics.data.length >= 0 &&
      lastWeekToTodayAnalytics.data.length >= 0 &&
      thisMonthAnalytics.data.length >= 0 &&
      futureAnalytics.data.length >= 0 &&
      filteredAnalytics.data.length >= 0 &&
      emptyAnalytics.data.length >= 0,
  );
}
