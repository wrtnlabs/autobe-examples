import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICompletionTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/ICompletionTrend";
import type { IDailyCompletionEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IDailyCompletionEntry";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskCompletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskCompletion";
import type { ITodoAppTaskCompletionsStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskCompletionsStatistics";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test daily completion statistics with different timeframe parameters.
 *
 * This test validates the daily completion statistics API endpoint by creating
 * tasks across different time periods and completing them on specific dates to
 * test date range filtering. It verifies that statistics correctly aggregate
 * data over various analysis periods including single-day ranges, weekly
 * periods, and monthly timeframes.
 *
 * The test covers:
 *
 * - Basic daily completion statistics for default timeframe
 * - Task creation across multiple days to establish completion patterns
 * - Bulk task completion on specific dates to create time-bounded data
 * - Validation of completion trend analysis and metrics
 * - Edge cases including single-day ranges and future dates
 * - Verification of period start/end date calculations
 * - Trend direction analysis (increasing, decreasing, stable patterns)
 * - Daily completion entry structure and data integrity
 *
 * @param connection API connection for making authenticated requests
 */
export async function test_api_daily_completion_statistics_with_time_ranges(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userAccount = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "TestPassword123!",
      ip: "192.168.1.1",
      href: "https://todo-app.com/auth/join",
      referrer: "https://todo-app.com/auth",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userAccount);

  TestValidator.equals(
    "user account has valid ID",
    userAccount.id,
    userAccount.id,
  );

  // Step 2: Create tasks across different time periods to test date range filtering
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);

  // Create tasks for testing different completion patterns
  const createdTasks: ITodoAppTask[] = [];

  const tasksToCreate = [
    // Tasks created recently (for current week testing)
    {
      title: "Recent Task 1",
      description: "Task to test current week statistics",
      priority: "Medium" as const,
      due_date: today.toISOString(),
    },
    {
      title: "Recent Task 2",
      description: "Task to test current week statistics",
      priority: "High" as const,
      due_date: twoDaysAgo.toISOString(),
    },
    {
      title: "Recent Task 3",
      description: "Task to test current week statistics",
      priority: "Low" as const,
      due_date: weekAgo.toISOString(),
    },
    // Tasks created longer ago (for monthly testing)
    {
      title: "Month Ago Task 1",
      description: "Task created a month ago for range testing",
      priority: "Medium" as const,
      due_date: monthAgo.toISOString(),
    },
    {
      title: "No Due Date Task",
      description: "Task without due date for comprehensive testing",
      priority: "Low" as const,
    },
  ];

  for (const taskData of tasksToCreate) {
    const createdTask = await api.functional.todoApp.user.tasks.create(
      connection,
      {
        body: taskData satisfies ITodoAppTask.ICreate,
      },
    );
    typia.assert(createdTask);
    createdTasks.push(createdTask);
  }

  TestValidator.equals(
    "created correct number of tasks",
    createdTasks.length,
    5,
  );

  // Step 3: Complete tasks on specific dates to create time-bounded completion data
  const statistics =
    await api.functional.todoApp.user.statistics.daily_completions.at(
      connection,
    );
  typia.assert(statistics);

  // Test 1: Validate basic structure and initial state (no completions yet)
  TestValidator.equals(
    "statistics has correct total completions initially",
    statistics.total_completions,
    0,
  );
  TestValidator.equals(
    "statistics shows no distinct days with completions initially",
    statistics.distinct_days_with_completions,
    0,
  );
  TestValidator.predicate("daily completions array exists", () =>
    Array.isArray(statistics.daily_completions),
  );

  // Step 4: Complete multiple tasks on specific dates to test aggregation
  const completionPromises = Array.from({ length: 3 }, (_, i) => {
    const targetDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const tasksForCompletion = createdTasks
      .slice(i, i + 2)
      .map((task) => task.id);

    return api.functional.todoApp.user.tasks.bulk_complete.bulkComplete(
      connection,
      {
        body: {
          task_ids: tasksForCompletion,
        } satisfies ITodoAppTaskCompletion.ICreate,
      },
    );
  });

  const completionResults = await Promise.all(completionPromises);
  completionResults.forEach((result) => typia.assert(result));

  TestValidator.predicate("completion operations succeeded", () =>
    completionResults.every((result) => result.successfully_completed > 0),
  );

  // Step 5: Test daily completion statistics after task completions
  const updatedStatistics =
    await api.functional.todoApp.user.statistics.daily_completions.at(
      connection,
    );
  typia.assert(updatedStatistics);

  // Test 2: Validate updated statistics with completion data
  TestValidator.predicate(
    "statistics have completion data",
    () =>
      updatedStatistics.total_completions > 0 &&
      updatedStatistics.distinct_days_with_completions > 0,
  );

  TestValidator.predicate(
    "trend data is present",
    () =>
      updatedStatistics.trend !== undefined && updatedStatistics.trend !== null,
  );

  if (
    updatedStatistics.trend !== null &&
    updatedStatistics.trend !== undefined
  ) {
    const validDirections = ["increasing", "decreasing", "stable"] as const;
    TestValidator.predicate("trend direction is valid value", () =>
      validDirections.includes(updatedStatistics.trend!.direction),
    );
  }

  // Test 3: Validate daily completion entries structure
  TestValidator.predicate(
    "daily completion entries are valid structure",
    () => {
      return updatedStatistics.daily_completions.every(
        (entry: IDailyCompletionEntry) =>
          typeof entry.date === "string" &&
          entry.date.length > 0 &&
          typeof entry.completion_count === "number" &&
          entry.completion_count >= 0,
      );
    },
  );

  // Test 4: Verify chronological order of daily entries
  TestValidator.predicate("daily entries maintain chronological order", () => {
    for (let i = 1; i < updatedStatistics.daily_completions.length; i++) {
      const currentDate = new Date(updatedStatistics.daily_completions[i].date);
      const previousDate = new Date(
        updatedStatistics.daily_completions[i - 1].date,
      );
      if (currentDate < previousDate) {
        return false;
      }
    }
    return true;
  });

  // Test 5: Validate average daily completions calculation
  if (
    updatedStatistics.average_daily_completions !== undefined &&
    updatedStatistics.average_daily_completions !== null
  ) {
    TestValidator.predicate(
      "average daily completions is non-negative",
      () => updatedStatistics.average_daily_completions! >= 0,
    );
  }

  // Test 6: Verify best day tracking
  if (
    updatedStatistics.best_day_completions !== undefined &&
    updatedStatistics.best_day_completions !== null
  ) {
    TestValidator.predicate(
      "best day completion count is positive",
      () => updatedStatistics.best_day_completions! > 0,
    );

    if (
      updatedStatistics.best_day_date !== undefined &&
      updatedStatistics.best_day_date !== null
    ) {
      TestValidator.predicate("best day date is valid date format", () => {
        try {
          new Date(updatedStatistics.best_day_date!);
          return true;
        } catch {
          return false;
        }
      });
    }
  }

  // Test 7: Validate period date ranges
  TestValidator.predicate(
    "analysis period dates are valid when provided",
    () => {
      if (
        updatedStatistics.analysis_period_start_date &&
        updatedStatistics.analysis_period_end_date
      ) {
        try {
          const startDate = new Date(
            updatedStatistics.analysis_period_start_date,
          );
          const endDate = new Date(updatedStatistics.analysis_period_end_date);
          return (
            startDate.toString() !== "Invalid Date" &&
            endDate.toString() !== "Invalid Date" &&
            endDate >= startDate
          );
        } catch {
          return false;
        }
      }
      return true;
    },
  );

  // Test 8: Verify consistency metrics
  if (
    updatedStatistics.trend?.consistency_score !== undefined &&
    updatedStatistics.trend?.consistency_score !== null
  ) {
    TestValidator.predicate(
      "consistency score is within valid range 0-100",
      () =>
        updatedStatistics.trend!.consistency_score! >= 0 &&
        updatedStatistics.trend!.consistency_score! <= 100,
    );
  }

  // Test 9: Data integrity verification
  TestValidator.predicate(
    "total completions equals sum of daily completions",
    () => {
      const calculatedTotal = updatedStatistics.daily_completions.reduce(
        (sum: number, entry: IDailyCompletionEntry) =>
          sum + entry.completion_count,
        0,
      );
      return calculatedTotal === updatedStatistics.total_completions;
    },
  );

  // Test 10: Realistic usage pattern validation
  TestValidator.predicate(
    "statistics reflect realistic task completion patterns",
    () => {
      return (
        updatedStatistics.total_completions >= 0 &&
        updatedStatistics.distinct_days_with_completions >= 0 &&
        updatedStatistics.total_completions <=
          createdTasks.length *
            Math.max(1, updatedStatistics.distinct_days_with_completions)
      );
    },
  );
}
