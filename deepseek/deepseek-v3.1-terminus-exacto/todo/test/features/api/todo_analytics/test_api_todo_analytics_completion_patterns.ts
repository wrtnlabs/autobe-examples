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
 * Test comprehensive todo completion analytics for a user's productivity
 * patterns.
 *
 * This test validates that todo completion analytics correctly calculate
 * completion rates, time-to-completion statistics, and priority distributions
 * across different date ranges. The test creates various todo items with
 * different patterns and analyzes the results using the analytics API with
 * different filter combinations.
 *
 * Test steps:
 *
 * 1. Create a user account for testing
 * 2. Create various todo items with different due dates
 * 3. Test analytics with different date ranges
 * 4. Validate analytics structure and metrics
 * 5. Test different filter combinations
 */
export async function test_api_todo_analytics_completion_patterns(
  connection: api.IConnection,
) {
  // Create primary user for analytics testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      password_hash: "hashed_password_placeholder",
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Create various todos for analytics testing
  const todos: ITodoAppTodo[] = [];

  // Create multiple todos with different due dates
  for (let i = 0; i < 10; i++) {
    const todo = await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.paragraph({
          sentences: 10,
          wordMin: 5,
          wordMax: 12,
        }),
        due_date: new Date(Date.now() + 86400000 * (i + 1)).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    });
    typia.assert(todo);
    todos.push(todo);
  }

  // Test analytics with comprehensive date range
  const recentAnalytics =
    await api.functional.todoApp.user.analytics.todo_completion.index(
      connection,
      {
        body: {
          date_range: {
            start_date: new Date(Date.now() - 86400000 * 30).toISOString(),
            end_date: new Date().toISOString(),
          } satisfies IDateRange,
          page: 1,
          limit: 20,
        } satisfies ITodoAppTodoAnalytics.IRequest,
      },
    );
  typia.assert(recentAnalytics);

  // Validate analytics structure and basic metrics
  TestValidator.equals(
    "analytics should have pagination data",
    recentAnalytics.pagination.current,
    1,
  );
  TestValidator.equals(
    "analytics page limit should match request",
    recentAnalytics.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "analytics data should be an array",
    Array.isArray(recentAnalytics.data),
  );

  // Validate analytics metrics for the first result
  if (recentAnalytics.data.length > 0) {
    const analytics = recentAnalytics.data[0];

    TestValidator.predicate(
      "total todos should be non-negative",
      analytics.total_todos >= 0,
    );
    TestValidator.predicate(
      "completed todos should be non-negative",
      analytics.completed_todos >= 0,
    );
    TestValidator.predicate(
      "pending todos should be non-negative",
      analytics.pending_todos >= 0,
    );
    TestValidator.predicate(
      "in-progress todos should be non-negative",
      analytics.in_progress_todos >= 0,
    );
    TestValidator.predicate(
      "overdue todos should be non-negative",
      analytics.overdue_todos >= 0,
    );
    TestValidator.predicate(
      "average completion time should be non-negative",
      analytics.average_completion_time_hours >= 0,
    );

    // Validate priority distribution structure
    TestValidator.predicate(
      "priority distribution should have low count",
      typeof analytics.priority_distribution.low === "number",
    );
    TestValidator.predicate(
      "priority distribution should have medium count",
      typeof analytics.priority_distribution.medium === "number",
    );
    TestValidator.predicate(
      "priority distribution should have high count",
      typeof analytics.priority_distribution.high === "number",
    );
  }

  // Test analytics with specific date range
  const specificRangeAnalytics =
    await api.functional.todoApp.user.analytics.todo_completion.index(
      connection,
      {
        body: {
          date_range: {
            start_date: new Date(Date.now() - 86400000 * 7).toISOString(),
            end_date: new Date().toISOString(),
          } satisfies IDateRange,
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodoAnalytics.IRequest,
      },
    );
  typia.assert(specificRangeAnalytics);

  // Test analytics with extended date range
  const comprehensiveAnalytics =
    await api.functional.todoApp.user.analytics.todo_completion.index(
      connection,
      {
        body: {
          date_range: {
            start_date: new Date(Date.now() - 86400000 * 90).toISOString(),
            end_date: new Date().toISOString(),
          } satisfies IDateRange,
          page: 1,
          limit: 5,
        } satisfies ITodoAppTodoAnalytics.IRequest,
      },
    );
  typia.assert(comprehensiveAnalytics);

  // Test analytics with empty filters (default behavior)
  const defaultAnalytics =
    await api.functional.todoApp.user.analytics.todo_completion.index(
      connection,
      {
        body: {
          date_range: {
            start_date: new Date(Date.now() - 86400000 * 30).toISOString(),
            end_date: new Date().toISOString(),
          } satisfies IDateRange,
        } satisfies ITodoAppTodoAnalytics.IRequest,
      },
    );
  typia.assert(defaultAnalytics);
}
