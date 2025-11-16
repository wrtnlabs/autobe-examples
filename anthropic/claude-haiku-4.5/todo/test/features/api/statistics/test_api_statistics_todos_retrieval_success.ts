import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppTodoStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatistics";
import type { ITodoCompletionTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoCompletionTrendDay";
import type { ITodoCreationTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoCreationTrendDay";

/**
 * Test successful retrieval of aggregate todo statistics through the public
 * endpoint.
 *
 * Validates that the system correctly computes and returns comprehensive todo
 * metrics including total count, completed count, completion rate, creation and
 * completion trends over the last 30 days, temporal patterns (most active hour
 * and day of week), average completion time, and longest incomplete todo
 * duration. The test ensures all required statistical fields are present and
 * contain realistic numeric values.
 *
 * This represents the primary user workflow where administrators or system
 * monitors access the dashboard to review overall todo management metrics
 * without requiring authentication.
 *
 * Test Steps:
 *
 * 1. Retrieve todo statistics from the public endpoint
 * 2. Validate response structure and all required fields are present
 * 3. Verify numerical constraints and realistic value ranges
 * 4. Validate completion rate percentage is between 0-100
 * 5. Verify trend data contains appropriate date formats and counts
 * 6. Validate temporal patterns have valid hour (0-23) and day of week values
 */
export async function test_api_statistics_todos_retrieval_success(
  connection: api.IConnection,
) {
  // Step 1: Retrieve todo statistics from the public endpoint
  const statistics: ITodoAppTodoStatistics =
    await api.functional.todoApp.statistics.todos.index(connection);

  // Step 2: Validate response structure and all required fields are present
  typia.assert(statistics);

  // Step 3: Verify the response contains all required properties
  TestValidator.predicate(
    "statistics object has total_todos property",
    typeof statistics.total_todos === "number" && statistics.total_todos >= 0,
  );

  TestValidator.predicate(
    "statistics object has completed_todos property",
    typeof statistics.completed_todos === "number" &&
      statistics.completed_todos >= 0,
  );

  TestValidator.predicate(
    "statistics object has incomplete_todos property",
    typeof statistics.incomplete_todos === "number" &&
      statistics.incomplete_todos >= 0,
  );

  TestValidator.predicate(
    "total_todos equals sum of completed and incomplete",
    statistics.total_todos ===
      statistics.completed_todos + statistics.incomplete_todos,
  );

  // Step 4: Validate completion rate percentage is between 0-100
  TestValidator.predicate(
    "completion_rate_percent is between 0 and 100",
    statistics.completion_rate_percent >= 0 &&
      statistics.completion_rate_percent <= 100,
  );

  // Validate completion rate calculation accuracy
  const expectedRate =
    statistics.total_todos > 0
      ? (statistics.completed_todos / statistics.total_todos) * 100
      : 0;
  TestValidator.predicate(
    "completion_rate_percent matches calculated value",
    Math.abs(statistics.completion_rate_percent - expectedRate) < 0.01,
  );

  // Step 5: Verify recent activity metrics
  TestValidator.predicate(
    "todos_created_today is non-negative",
    statistics.todos_created_today >= 0,
  );

  TestValidator.predicate(
    "todos_created_7d is non-negative and >= today",
    statistics.todos_created_7d >= statistics.todos_created_today,
  );

  TestValidator.predicate(
    "todos_created_30d is non-negative and >= 7d",
    statistics.todos_created_30d >= statistics.todos_created_7d,
  );

  TestValidator.predicate(
    "todos_completed_today is non-negative",
    statistics.todos_completed_today >= 0,
  );

  TestValidator.predicate(
    "todos_completed_7d is non-negative and >= today",
    statistics.todos_completed_7d >= statistics.todos_completed_today,
  );

  // Step 6: Verify trend data structure and content
  TestValidator.predicate(
    "creation_trend is an array",
    Array.isArray(statistics.creation_trend),
  );

  TestValidator.predicate(
    "completion_trend is an array",
    Array.isArray(statistics.completion_trend),
  );

  // Validate creation trend entries
  for (const trend of statistics.creation_trend) {
    typia.assert(trend);
    TestValidator.predicate(
      "creation trend date is in valid format",
      /^\d{4}-\d{2}-\d{2}$/.test(trend.date),
    );
    TestValidator.predicate(
      "creation trend count is non-negative",
      trend.count >= 0,
    );
  }

  // Validate completion trend entries
  for (const trend of statistics.completion_trend) {
    typia.assert(trend);
    TestValidator.predicate(
      "completion trend date is in valid format",
      /^\d{4}-\d{2}-\d{2}$/.test(trend.date),
    );
    TestValidator.predicate(
      "completion trend count is non-negative",
      trend.count >= 0,
    );
  }

  // Step 7: Validate temporal patterns
  TestValidator.predicate(
    "most_active_creation_hour is valid (0-23)",
    /^([0-9]|1[0-9]|2[0-3])$/.test(statistics.most_active_creation_hour),
  );

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
    "most_active_creation_day is valid day of week",
    validDays.includes(statistics.most_active_creation_day),
  );

  // Step 8: Validate completion time metrics
  TestValidator.predicate(
    "average_completion_time_days is non-negative",
    statistics.average_completion_time_days >= 0,
  );

  TestValidator.predicate(
    "longest_incomplete_todo_days is non-negative",
    statistics.longest_incomplete_todo_days >= 0,
  );

  // Step 9: Validate average and median todos per user
  TestValidator.predicate(
    "average_todos_per_user is non-negative",
    statistics.average_todos_per_user >= 0,
  );

  TestValidator.predicate(
    "median_todos_per_user is non-negative",
    statistics.median_todos_per_user >= 0,
  );
}
