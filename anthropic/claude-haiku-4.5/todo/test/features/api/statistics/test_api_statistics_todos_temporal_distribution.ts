import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppTodoStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatistics";
import type { ITodoCompletionTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoCompletionTrendDay";
import type { ITodoCreationTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoCreationTrendDay";

/**
 * Test that todo statistics properly reflect temporal distribution and activity
 * patterns.
 *
 * This test validates the temporal analysis capabilities of the statistics
 * endpoint by:
 *
 * 1. Retrieving aggregate statistics about all todo items in the system
 * 2. Verifying that creation_trend and completion_trend arrays contain exactly 30
 *    days of historical data
 * 3. Validating that all trend entries have correct date format (YYYY-MM-DD) and
 *    non-negative counts
 * 4. Ensuring trend data is chronologically ordered (oldest to newest)
 * 5. Confirming that most_active_creation_hour is a valid hour (0-23)
 * 6. Confirming that most_active_creation_day is a valid day of week name
 *
 * The statistics endpoint provides system-wide summaries without exposing
 * individual user data, making it suitable for dashboard displays, admin
 * monitoring, and analytics reporting.
 */
export async function test_api_statistics_todos_temporal_distribution(
  connection: api.IConnection,
) {
  // Step 1: Retrieve todo statistics from the API
  const statistics: ITodoAppTodoStatistics =
    await api.functional.todoApp.statistics.todos.index(connection);
  typia.assert(statistics);

  // Step 2: Validate creation trend data
  TestValidator.predicate(
    "creation_trend should be an array with exactly 30 days of data",
    Array.isArray(statistics.creation_trend) &&
      statistics.creation_trend.length === 30,
  );

  // Step 3: Validate completion trend data
  TestValidator.predicate(
    "completion_trend should be an array with exactly 30 days of data",
    Array.isArray(statistics.completion_trend) &&
      statistics.completion_trend.length === 30,
  );

  // Step 4: Validate creation trend entries have correct format and are chronologically ordered
  for (let i = 0; i < statistics.creation_trend.length; i++) {
    const entry = statistics.creation_trend[i];

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    TestValidator.predicate(
      `creation_trend[${i}] date should match YYYY-MM-DD format`,
      dateRegex.test(entry.date),
    );

    // Validate count is non-negative integer
    TestValidator.predicate(
      `creation_trend[${i}] count should be a non-negative integer`,
      Number.isInteger(entry.count) && entry.count >= 0,
    );

    // Validate chronological order (if not first entry)
    if (i > 0) {
      const previousDate = new Date(statistics.creation_trend[i - 1].date);
      const currentDate = new Date(entry.date);
      TestValidator.predicate(
        `creation_trend[${i}] should be chronologically ordered after creation_trend[${i - 1}]`,
        previousDate <= currentDate,
      );
    }
  }

  // Step 5: Validate completion trend entries have correct format and are chronologically ordered
  for (let i = 0; i < statistics.completion_trend.length; i++) {
    const entry = statistics.completion_trend[i];

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    TestValidator.predicate(
      `completion_trend[${i}] date should match YYYY-MM-DD format`,
      dateRegex.test(entry.date),
    );

    // Validate count is non-negative integer
    TestValidator.predicate(
      `completion_trend[${i}] count should be a non-negative integer`,
      Number.isInteger(entry.count) && entry.count >= 0,
    );

    // Validate chronological order (if not first entry)
    if (i > 0) {
      const previousDate = new Date(statistics.completion_trend[i - 1].date);
      const currentDate = new Date(entry.date);
      TestValidator.predicate(
        `completion_trend[${i}] should be chronologically ordered after completion_trend[${i - 1}]`,
        previousDate <= currentDate,
      );
    }
  }

  // Step 6: Validate most_active_creation_hour is a valid hour (0-23)
  const hour = parseInt(statistics.most_active_creation_hour);
  TestValidator.predicate(
    "most_active_creation_hour should be a valid hour between 0 and 23",
    !isNaN(hour) && hour >= 0 && hour <= 23,
  );

  // Step 7: Validate most_active_creation_day is a valid day of week name
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
    "most_active_creation_day should be a valid day of week name",
    validDays.includes(statistics.most_active_creation_day),
  );

  // Step 8: Validate additional temporal metrics are reasonable
  TestValidator.predicate(
    "todos_created_today should be non-negative",
    statistics.todos_created_today >= 0,
  );

  TestValidator.predicate(
    "todos_created_7d should be non-negative and >= todos_created_today",
    statistics.todos_created_7d >= 0 &&
      statistics.todos_created_7d >= statistics.todos_created_today,
  );

  TestValidator.predicate(
    "todos_created_30d should be non-negative and >= todos_created_7d",
    statistics.todos_created_30d >= 0 &&
      statistics.todos_created_30d >= statistics.todos_created_7d,
  );

  TestValidator.predicate(
    "todos_completed_today should be non-negative",
    statistics.todos_completed_today >= 0,
  );

  TestValidator.predicate(
    "todos_completed_7d should be non-negative and >= todos_completed_today",
    statistics.todos_completed_7d >= 0 &&
      statistics.todos_completed_7d >= statistics.todos_completed_today,
  );
}
