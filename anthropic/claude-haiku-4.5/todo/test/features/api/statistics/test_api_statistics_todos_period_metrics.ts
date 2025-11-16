import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppTodoStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatistics";
import type { ITodoCompletionTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoCompletionTrendDay";
import type { ITodoCreationTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoCreationTrendDay";

export async function test_api_statistics_todos_period_metrics(
  connection: api.IConnection,
) {
  // Retrieve the todo statistics
  const stats: ITodoAppTodoStatistics =
    await api.functional.todoApp.statistics.todos.index(connection);
  typia.assert(stats);

  // Validate period-based creation metrics follow proper ordering
  // Each larger time window should contain at least as many todos as smaller windows
  TestValidator.predicate(
    "7d todos created >= today todos created",
    stats.todos_created_7d >= stats.todos_created_today,
  );
  TestValidator.predicate(
    "30d todos created >= 7d todos created",
    stats.todos_created_30d >= stats.todos_created_7d,
  );

  // Validate period-based completion metrics follow proper ordering
  TestValidator.predicate(
    "7d todos completed >= today todos completed",
    stats.todos_completed_7d >= stats.todos_completed_today,
  );

  // Validate aggregate metrics consistency
  // Total todos should equal completed + incomplete
  TestValidator.equals(
    "total todos equals completed + incomplete",
    stats.completed_todos + stats.incomplete_todos,
    stats.total_todos,
  );

  // Validate completion rate is within valid percentage range (0-100)
  TestValidator.predicate(
    "completion rate is between 0 and 100",
    stats.completion_rate_percent >= 0 && stats.completion_rate_percent <= 100,
  );

  // Validate completion rate accuracy
  const expectedCompletionRate =
    stats.total_todos > 0
      ? (stats.completed_todos / stats.total_todos) * 100
      : 0;
  TestValidator.equals(
    "completion rate matches calculated value",
    Math.round(expectedCompletionRate * 100) / 100,
    Math.round(stats.completion_rate_percent * 100) / 100,
  );

  // Validate average todos per user is non-negative
  TestValidator.predicate(
    "average todos per user is non-negative",
    stats.average_todos_per_user >= 0,
  );

  // Validate most active creation hour is valid (0-23)
  TestValidator.predicate("most active creation hour is valid (0-23)", () => {
    const hour = parseInt(stats.most_active_creation_hour, 10);
    return !isNaN(hour) && hour >= 0 && hour <= 23;
  });

  // Validate most active creation day is a valid day of week
  const validDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ] as const;
  TestValidator.predicate(
    "most active creation day is valid day of week",
    validDays.includes(stats.most_active_creation_day as any),
  );

  // Validate creation trend array
  TestValidator.predicate(
    "creation trend array exists and is array",
    Array.isArray(stats.creation_trend),
  );

  // Validate each creation trend entry has proper structure
  if (stats.creation_trend.length > 0) {
    const firstTrendEntry = stats.creation_trend[0];
    TestValidator.predicate(
      "creation trend entries have date property",
      typeof firstTrendEntry.date === "string",
    );
    TestValidator.predicate(
      "creation trend entries have count property",
      typeof firstTrendEntry.count === "number",
    );
    TestValidator.predicate(
      "creation trend counts are non-negative",
      firstTrendEntry.count >= 0,
    );

    // Validate date format (YYYY-MM-DD)
    TestValidator.predicate(
      "creation trend dates are in YYYY-MM-DD format",
      /^\d{4}-\d{2}-\d{2}$/.test(firstTrendEntry.date),
    );
  }

  // Validate completion trend array
  TestValidator.predicate(
    "completion trend array exists and is array",
    Array.isArray(stats.completion_trend),
  );

  // Validate each completion trend entry has proper structure
  if (stats.completion_trend.length > 0) {
    const firstCompletionEntry = stats.completion_trend[0];
    TestValidator.predicate(
      "completion trend entries have date property",
      typeof firstCompletionEntry.date === "string",
    );
    TestValidator.predicate(
      "completion trend entries have count property",
      typeof firstCompletionEntry.count === "number",
    );
    TestValidator.predicate(
      "completion trend counts are non-negative",
      firstCompletionEntry.count >= 0,
    );

    // Validate date format (YYYY-MM-DD)
    TestValidator.predicate(
      "completion trend dates are in YYYY-MM-DD format",
      /^\d{4}-\d{2}-\d{2}$/.test(firstCompletionEntry.date),
    );
  }

  // Validate average completion time is non-negative
  TestValidator.predicate(
    "average completion time is non-negative",
    stats.average_completion_time_days >= 0,
  );

  // Validate longest incomplete todo days is non-negative
  TestValidator.predicate(
    "longest incomplete todo days is non-negative",
    stats.longest_incomplete_todo_days >= 0,
  );

  // Validate median todos per user is non-negative
  TestValidator.predicate(
    "median todos per user is non-negative",
    stats.median_todos_per_user >= 0,
  );

  // Validate median is less than or equal to average (typical distribution)
  TestValidator.predicate(
    "median todos per user <= average todos per user",
    stats.median_todos_per_user <= stats.average_todos_per_user,
  );
}
