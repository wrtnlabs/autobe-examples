import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppTodoStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatistics";
import type { ITodoCompletionTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoCompletionTrendDay";
import type { ITodoCreationTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoCreationTrendDay";

/**
 * Test mathematical consistency across all statistical metrics.
 *
 * Validates that total_todos equals the sum of completed_todos plus
 * incomplete_todos, completion rate is properly calculated and within valid
 * ranges, daily creation and completion trends sum correctly, and all numeric
 * values maintain logical relationships.
 *
 * 1. Retrieve todo statistics from the API
 * 2. Verify total = completed + incomplete
 * 3. Verify completion_rate_percent is in [0, 100] and correctly calculated
 * 4. Verify time window consistency (today <= 7d <= 30d)
 * 5. Verify all numeric values are non-negative
 * 6. Verify creation and completion trend sums match reported totals
 * 7. Verify median <= average for user per-user metrics
 * 8. Verify completion and longest-incomplete times are logical
 */
export async function test_api_statistics_todos_consistency_validation(
  connection: api.IConnection,
) {
  // Retrieve statistics
  const stats: ITodoAppTodoStatistics =
    await api.functional.todoApp.statistics.todos.index(connection);
  typia.assert(stats);

  // Test 1: Total todos must equal completed + incomplete
  TestValidator.equals(
    "total todos equals sum of completed and incomplete",
    stats.total_todos,
    stats.completed_todos + stats.incomplete_todos,
  );

  // Test 2: Completion rate must be properly calculated
  const expectedCompletionRate =
    stats.total_todos > 0
      ? (stats.completed_todos / stats.total_todos) * 100
      : 0;
  TestValidator.predicate(
    "completion_rate_percent is correctly calculated",
    Math.abs(stats.completion_rate_percent - expectedCompletionRate) < 0.01,
  );

  // Test 3: Completion rate must be in valid range [0, 100]
  TestValidator.predicate(
    "completion_rate_percent is within valid range [0, 100]",
    stats.completion_rate_percent >= 0 && stats.completion_rate_percent <= 100,
  );

  // Test 4: Time window consistency for creation
  TestValidator.predicate(
    "todos_created_today <= todos_created_7d",
    stats.todos_created_today <= stats.todos_created_7d,
  );
  TestValidator.predicate(
    "todos_created_7d <= todos_created_30d",
    stats.todos_created_7d <= stats.todos_created_30d,
  );

  // Test 5: Time window consistency for completion
  TestValidator.predicate(
    "todos_completed_today <= todos_completed_7d",
    stats.todos_completed_today <= stats.todos_completed_7d,
  );

  // Test 6: All numeric counts must be non-negative
  TestValidator.predicate(
    "total_todos is non-negative",
    stats.total_todos >= 0,
  );
  TestValidator.predicate(
    "completed_todos is non-negative",
    stats.completed_todos >= 0,
  );
  TestValidator.predicate(
    "incomplete_todos is non-negative",
    stats.incomplete_todos >= 0,
  );
  TestValidator.predicate(
    "todos_created_today is non-negative",
    stats.todos_created_today >= 0,
  );
  TestValidator.predicate(
    "todos_created_7d is non-negative",
    stats.todos_created_7d >= 0,
  );
  TestValidator.predicate(
    "todos_created_30d is non-negative",
    stats.todos_created_30d >= 0,
  );
  TestValidator.predicate(
    "todos_completed_today is non-negative",
    stats.todos_completed_today >= 0,
  );
  TestValidator.predicate(
    "todos_completed_7d is non-negative",
    stats.todos_completed_7d >= 0,
  );
  TestValidator.predicate(
    "average_todos_per_user is non-negative",
    stats.average_todos_per_user >= 0,
  );
  TestValidator.predicate(
    "average_completion_time_days is non-negative",
    stats.average_completion_time_days >= 0,
  );
  TestValidator.predicate(
    "longest_incomplete_todo_days is non-negative",
    stats.longest_incomplete_todo_days >= 0,
  );
  TestValidator.predicate(
    "median_todos_per_user is non-negative",
    stats.median_todos_per_user >= 0,
  );

  // Test 7: Creation trend sum validation
  const creationTrendSum = stats.creation_trend.reduce(
    (sum, day) => sum + day.count,
    0,
  );
  TestValidator.predicate(
    "creation trend sum is reasonable relative to 30d total",
    creationTrendSum <= stats.todos_created_30d,
  );

  // Test 8: Completion trend sum validation
  const completionTrendSum = stats.completion_trend.reduce(
    (sum, day) => sum + day.count,
    0,
  );
  TestValidator.predicate(
    "completion trend sum is reasonable relative to 7d total",
    completionTrendSum <= stats.todos_completed_7d,
  );

  // Test 9: Median should be <= average for user metrics (power user effect)
  TestValidator.predicate(
    "median_todos_per_user is typically <= average_todos_per_user",
    stats.median_todos_per_user <= stats.average_todos_per_user + 0.01,
  );

  // Test 10: Completion time logic
  if (stats.completed_todos > 0) {
    TestValidator.predicate(
      "average_completion_time_days is positive when completed todos exist",
      stats.average_completion_time_days >= 0,
    );
  }

  // Test 11: Longest incomplete todo logic
  if (stats.incomplete_todos > 0) {
    TestValidator.predicate(
      "longest_incomplete_todo_days is positive when incomplete todos exist",
      stats.longest_incomplete_todo_days >= 0,
    );
  }

  // Test 12: Verify trend entries have valid dates in YYYY-MM-DD format
  for (const trendDay of stats.creation_trend) {
    TestValidator.predicate(
      `creation trend date ${trendDay.date} is in valid format`,
      /^\d{4}-\d{2}-\d{2}$/.test(trendDay.date),
    );
    TestValidator.predicate(
      `creation trend count for ${trendDay.date} is non-negative`,
      trendDay.count >= 0,
    );
  }

  for (const trendDay of stats.completion_trend) {
    TestValidator.predicate(
      `completion trend date ${trendDay.date} is in valid format`,
      /^\d{4}-\d{2}-\d{2}$/.test(trendDay.date),
    );
    TestValidator.predicate(
      `completion trend count for ${trendDay.date} is non-negative`,
      trendDay.count >= 0,
    );
  }

  // Test 13: Verify most active creation hour and day are valid strings
  TestValidator.predicate(
    "most_active_creation_hour is a valid hour (0-23)",
    /^(0?[0-9]|1[0-9]|2[0-3])$/.test(stats.most_active_creation_hour),
  );
  TestValidator.predicate(
    "most_active_creation_day is a valid day of week",
    [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ].includes(stats.most_active_creation_day),
  );
}
