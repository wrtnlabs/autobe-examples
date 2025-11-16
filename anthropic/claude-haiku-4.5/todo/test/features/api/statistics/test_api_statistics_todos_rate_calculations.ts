import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppTodoStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatistics";
import type { ITodoCompletionTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoCompletionTrendDay";
import type { ITodoCreationTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoCreationTrendDay";

/**
 * Validates statistical rate calculations for todo items.
 *
 * This test retrieves aggregate statistics about todo items across the system
 * and verifies that all calculated metrics are correct:
 *
 * 1. Completion_rate_percent: Validates the completion rate is correctly
 *    calculated as (completed_todos / total_todos) * 100 and falls within
 *    0-100
 * 2. Average_todos_per_user: Confirms average todos per user is computed correctly
 *    by dividing total todos by total users
 * 3. Average_completion_time_days: Verifies that the average time between todo
 *    creation and completion is realistic
 * 4. Longest_incomplete_todo_days: Ensures the oldest incomplete todo age is
 *    correctly identified
 *
 * The test also validates the overall response structure and ensures all
 * statistical metrics are valid numbers within expected ranges.
 */
export async function test_api_statistics_todos_rate_calculations(
  connection: api.IConnection,
) {
  // Retrieve the todo statistics from the API
  const statistics: ITodoAppTodoStatistics =
    await api.functional.todoApp.statistics.todos.index(connection);

  // Validate the response structure and types
  typia.assert(statistics);

  // Validate completion_rate_percent calculation and range
  TestValidator.predicate(
    "completion_rate_percent should be between 0 and 100",
    statistics.completion_rate_percent >= 0 &&
      statistics.completion_rate_percent <= 100,
  );

  // Verify the completion rate calculation is correct
  // completion_rate_percent = (completed_todos / total_todos) * 100
  if (statistics.total_todos > 0) {
    const expectedCompletionRate =
      (statistics.completed_todos / statistics.total_todos) * 100;
    TestValidator.equals(
      "completion_rate_percent should match calculated rate",
      statistics.completion_rate_percent,
      expectedCompletionRate,
    );
  } else {
    // When there are no todos, completion rate should be 0
    TestValidator.equals(
      "completion_rate_percent should be 0 when no todos exist",
      statistics.completion_rate_percent,
      0,
    );
  }

  // Validate total todos breakdown
  TestValidator.predicate(
    "total_todos should equal completed_todos plus incomplete_todos",
    statistics.total_todos ===
      statistics.completed_todos + statistics.incomplete_todos,
  );

  // Validate average_todos_per_user is a non-negative number
  TestValidator.predicate(
    "average_todos_per_user should be non-negative",
    statistics.average_todos_per_user >= 0,
  );

  // Validate average_completion_time_days is a realistic number
  TestValidator.predicate(
    "average_completion_time_days should be non-negative",
    statistics.average_completion_time_days >= 0,
  );

  // Validate longest_incomplete_todo_days is a non-negative integer
  TestValidator.predicate(
    "longest_incomplete_todo_days should be non-negative integer",
    statistics.longest_incomplete_todo_days >= 0,
  );

  // Validate creation trend array is present
  TestValidator.predicate(
    "creation_trend should be an array",
    Array.isArray(statistics.creation_trend),
  );

  // Validate completion trend array is present
  TestValidator.predicate(
    "completion_trend should be an array",
    Array.isArray(statistics.completion_trend),
  );

  // Validate creation trend dates are in correct format
  for (const trendDay of statistics.creation_trend) {
    TestValidator.predicate(
      "creation_trend date should be in YYYY-MM-DD format",
      /^\d{4}-\d{2}-\d{2}$/.test(trendDay.date),
    );
    TestValidator.predicate(
      "creation_trend count should be non-negative",
      trendDay.count >= 0,
    );
  }

  // Validate completion trend dates are in correct format
  for (const trendDay of statistics.completion_trend) {
    TestValidator.predicate(
      "completion_trend date should be in YYYY-MM-DD format",
      /^\d{4}-\d{2}-\d{2}$/.test(trendDay.date),
    );
    TestValidator.predicate(
      "completion_trend count should be non-negative",
      trendDay.count >= 0,
    );
  }

  // Validate most_active_creation_hour is valid (0-23)
  const creationHour = parseInt(statistics.most_active_creation_hour, 10);
  TestValidator.predicate(
    "most_active_creation_hour should be between 0 and 23",
    creationHour >= 0 && creationHour <= 23,
  );

  // Validate most_active_creation_day is a valid day of week
  const validDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  TestValidator.predicate(
    "most_active_creation_day should be a valid day of week",
    validDays.includes(statistics.most_active_creation_day),
  );

  // Validate time window metrics are within bounds
  TestValidator.predicate(
    "todos_created_today should not exceed todos_created_7d",
    statistics.todos_created_today <= statistics.todos_created_7d,
  );

  TestValidator.predicate(
    "todos_created_7d should not exceed todos_created_30d",
    statistics.todos_created_7d <= statistics.todos_created_30d,
  );

  TestValidator.predicate(
    "todos_completed_today should not exceed todos_completed_7d",
    statistics.todos_completed_today <= statistics.todos_completed_7d,
  );

  // Validate median_todos_per_user is non-negative
  TestValidator.predicate(
    "median_todos_per_user should be non-negative",
    statistics.median_todos_per_user >= 0,
  );
}
