import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppTodoStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatistics";
import type { ITodoCompletionTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoCompletionTrendDay";
import type { ITodoCreationTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoCreationTrendDay";

/**
 * Test the statistics endpoint behavior with an empty or minimal todo system.
 *
 * This test validates that the statistics API gracefully handles scenarios
 * where the system has zero or very few todos. The endpoint should return valid
 * statistics with all metrics degrading to zero, empty arrays, or neutral
 * values rather than throwing errors or returning invalid data.
 *
 * Key validations:
 *
 * - Completion_rate_percent is 0 when total_todos is 0 (no division by zero)
 * - All count fields (total_todos, completed_todos, incomplete_todos, etc.) are 0
 * - Trend arrays (creation_trend, completion_trend) are empty or contain zeros
 * - Average calculations (average_todos_per_user, median_todos_per_user) handle
 *   zero case
 * - All numeric values are non-negative
 * - Response structure is valid and complete
 */
export async function test_api_statistics_todos_empty_system(
  connection: api.IConnection,
) {
  // Call the statistics endpoint to retrieve system-wide todo statistics
  const statistics: ITodoAppTodoStatistics =
    await api.functional.todoApp.statistics.todos.index(connection);

  // Validate the response structure and type
  typia.assert(statistics);

  // Validate that completion_rate_percent is 0 when there are no todos (no zero-division error)
  TestValidator.equals(
    "completion_rate_percent should be 0 when no todos exist",
    statistics.completion_rate_percent,
    0,
  );

  // Validate that total_todos is 0 in an empty system
  TestValidator.equals(
    "total_todos should be 0 in empty system",
    statistics.total_todos,
    0,
  );

  // Validate that completed_todos is 0 in an empty system
  TestValidator.equals(
    "completed_todos should be 0 in empty system",
    statistics.completed_todos,
    0,
  );

  // Validate that incomplete_todos is 0 in an empty system
  TestValidator.equals(
    "incomplete_todos should be 0 in empty system",
    statistics.incomplete_todos,
    0,
  );

  // Validate that todos_created_today is 0
  TestValidator.equals(
    "todos_created_today should be 0 in empty system",
    statistics.todos_created_today,
    0,
  );

  // Validate that todos_created_7d is 0
  TestValidator.equals(
    "todos_created_7d should be 0 in empty system",
    statistics.todos_created_7d,
    0,
  );

  // Validate that todos_created_30d is 0
  TestValidator.equals(
    "todos_created_30d should be 0 in empty system",
    statistics.todos_created_30d,
    0,
  );

  // Validate that todos_completed_today is 0
  TestValidator.equals(
    "todos_completed_today should be 0 in empty system",
    statistics.todos_completed_today,
    0,
  );

  // Validate that todos_completed_7d is 0
  TestValidator.equals(
    "todos_completed_7d should be 0 in empty system",
    statistics.todos_completed_7d,
    0,
  );

  // Validate that creation_trend array is empty or contains only zero counts
  TestValidator.predicate(
    "creation_trend should be empty in empty system",
    () =>
      statistics.creation_trend.length === 0 ||
      statistics.creation_trend.every(
        (day: ITodoCreationTrendDay) => day.count === 0,
      ),
  );

  // Validate that completion_trend array is empty or contains only zero counts
  TestValidator.predicate(
    "completion_trend should be empty in empty system",
    () =>
      statistics.completion_trend.length === 0 ||
      statistics.completion_trend.every(
        (day: ITodoCompletionTrendDay) => day.count === 0,
      ),
  );

  // Validate that average_todos_per_user is 0 or a non-negative number
  TestValidator.predicate(
    "average_todos_per_user should be non-negative",
    statistics.average_todos_per_user >= 0,
  );

  // Validate that median_todos_per_user is 0 or a non-negative number
  TestValidator.predicate(
    "median_todos_per_user should be non-negative",
    statistics.median_todos_per_user >= 0,
  );

  // Validate that longest_incomplete_todo_days is 0 when no incomplete todos exist
  TestValidator.equals(
    "longest_incomplete_todo_days should be 0 with no incomplete todos",
    statistics.longest_incomplete_todo_days,
    0,
  );

  // Validate that average_completion_time_days is non-negative
  TestValidator.predicate(
    "average_completion_time_days should be non-negative",
    statistics.average_completion_time_days >= 0,
  );

  // Validate that most_active_creation_hour is a valid hour string (0-23)
  TestValidator.predicate(
    "most_active_creation_hour should be a valid hour",
    () => {
      const hour = parseInt(statistics.most_active_creation_hour, 10);
      return !isNaN(hour) && hour >= 0 && hour <= 23;
    },
  );

  // Validate that most_active_creation_day is a valid day of week
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
    () => validDays.includes(statistics.most_active_creation_day),
  );
}
