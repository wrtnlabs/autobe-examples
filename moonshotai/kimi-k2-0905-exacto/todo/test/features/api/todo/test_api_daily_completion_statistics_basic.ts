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
 * Test basic daily completion statistics retrieval.
 *
 * This test validates that authenticated users can access their task completion
 * statistics over various timeframes. Tests the operation returns correct daily
 * completion counts, total completions, and basic trend information. Verifies
 * the response includes proper date formatting and completion counts that
 * accurately reflect user activity.
 *
 * Test Steps:
 *
 * 1. Create a new user account through registration
 * 2. Create multiple todo tasks with different priorities and due dates
 * 3. Complete tasks on different days using bulk completion to generate varied
 *    data
 * 4. Retrieve daily completion statistics
 * 5. Validate the statistics structure and data integrity
 * 6. Verify date formatting, completion counts, and trend indicators
 */
export async function test_api_daily_completion_statistics_basic(
  connection: api.IConnection,
) {
  // Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "SecurePass123",
      ip: null,
      href: "https://todoapp.com/register",
      referrer: "https://todoapp.com/landing",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Create multiple tasks with different properties to test completion statistics
  const tasks: ITodoAppTask[] = [];

  // Create tasks with different priorities and properties
  for (let i = 0; i < 15; i++) {
    const task = await api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        description:
          i % 3 === 0
            ? RandomGenerator.content({
                paragraphs: 1,
                sentenceMin: 2,
                sentenceMax: 4,
              })
            : null,
        priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
        due_date:
          i % 2 === 0
            ? new Date(Date.now() + i * 86400000).toISOString()
            : null,
        completion_order: i,
      } satisfies ITodoAppTask.ICreate,
    });
    typia.assert(task);
    tasks.push(task);

    // Verify task is created with pending status
    TestValidator.predicate(
      "task created with pending status",
      task.status === "pending",
    );
  }

  // Complete tasks in batches to generate completion statistics
  const taskIds: string[] = tasks.map((task) => task.id);

  // Complete first batch (5 tasks) and verify completion
  const firstBatchIds = taskIds.slice(0, 5);
  const firstCompletion =
    await api.functional.todoApp.user.tasks.bulk_complete.bulkComplete(
      connection,
      {
        body: {
          task_ids: firstBatchIds,
        } satisfies ITodoAppTaskCompletion.ICreate,
      },
    );
  typia.assert(firstCompletion);
  TestValidator.equals(
    "first batch completion count",
    firstCompletion.successfully_completed,
    5,
  );
  TestValidator.equals(
    "first batch total requested",
    firstCompletion.total_requested,
    5,
  );

  // Complete second batch (5 tasks) and verify completion
  const secondBatchIds = taskIds.slice(5, 10);
  const secondCompletion =
    await api.functional.todoApp.user.tasks.bulk_complete.bulkComplete(
      connection,
      {
        body: {
          task_ids: secondBatchIds,
        } satisfies ITodoAppTaskCompletion.ICreate,
      },
    );
  typia.assert(secondCompletion);
  TestValidator.equals(
    "second batch completion count",
    secondCompletion.successfully_completed,
    5,
  );
  TestValidator.equals(
    "second batch total requested",
    secondCompletion.total_requested,
    5,
  );

  // Complete final batch (5 tasks) and verify completion
  const finalBatchIds = taskIds.slice(10);
  const finalCompletion =
    await api.functional.todoApp.user.tasks.bulk_complete.bulkComplete(
      connection,
      {
        body: {
          task_ids: finalBatchIds,
        } satisfies ITodoAppTaskCompletion.ICreate,
      },
    );
  typia.assert(finalCompletion);
  TestValidator.equals(
    "final batch completion count",
    finalCompletion.successfully_completed,
    5,
  );
  TestValidator.equals(
    "final batch total requested",
    finalCompletion.total_requested,
    5,
  );

  // Retrieve daily completion statistics
  const statistics =
    await api.functional.todoApp.user.statistics.daily_completions.at(
      connection,
    );
  typia.assert(statistics);

  // Validate the statistics structure and basic integrity
  TestValidator.predicate(
    "statistics has valid total completions",
    statistics.total_completions >= 0,
  );
  TestValidator.predicate(
    "statistics has valid distinct days count",
    statistics.distinct_days_with_completions >= 0,
  );
  TestValidator.predicate(
    "statistics has daily completions array",
    Array.isArray(statistics.daily_completions),
  );
  TestValidator.predicate(
    "statistics daily completions array is not empty",
    statistics.daily_completions.length > 0,
  );

  // Calculate expected total from daily entries for validation
  const calculatedTotal = statistics.daily_completions.reduce(
    (sum, entry) => sum + entry.completion_count,
    0,
  );
  TestValidator.equals(
    "calculated total matches statistics total",
    calculatedTotal,
    statistics.total_completions,
  );

  // Validate that daily completions entries have proper structure
  for (const entry of statistics.daily_completions) {
    typia.assert<IDailyCompletionEntry>(entry);
    TestValidator.predicate(
      "daily entry has valid date format",
      typia.is<string & tags.Format<"date">>(entry.date),
    );
    TestValidator.predicate(
      "daily entry has non-negative completion count",
      entry.completion_count >= 0,
    );
  }

  // Validate statistics summary values
  TestValidator.predicate(
    "distinct days count is reasonable",
    statistics.distinct_days_with_completions >= 0 &&
      statistics.distinct_days_with_completions <= 31,
  );
  TestValidator.predicate(
    "total completions matches expected range",
    statistics.total_completions >= 0 && statistics.total_completions <= 100,
  );

  // Validate optional trend information if present
  if (statistics.trend) {
    typia.assert<ICompletionTrend>(statistics.trend);
    TestValidator.predicate(
      "trend has valid direction",
      ["increasing", "decreasing", "stable"].includes(
        statistics.trend.direction,
      ),
    );

    if (statistics.trend.weekly_average_change_percent !== undefined) {
      TestValidator.predicate(
        "trend change percent is within valid range",
        statistics.trend.weekly_average_change_percent >= -100 &&
          statistics.trend.weekly_average_change_percent <= 100,
      );
    }

    if (statistics.trend.consistency_score !== undefined) {
      TestValidator.predicate(
        "consistency score is within valid range",
        statistics.trend.consistency_score >= 0 &&
          statistics.trend.consistency_score <= 100,
      );
    }
  }

  // Validate average daily completions if present
  if (statistics.average_daily_completions !== undefined) {
    TestValidator.predicate(
      "average daily completions is non-negative",
      statistics.average_daily_completions >= 0,
    );
    TestValidator.predicate(
      "average makes sense with daily data",
      statistics.average_daily_completions <= statistics.total_completions,
    );
  }

  // Validate best day information if present
  if (
    statistics.best_day_completions !== undefined &&
    statistics.best_day_date !== undefined
  ) {
    TestValidator.predicate(
      "best day completions is non-negative",
      statistics.best_day_completions >= 0,
    );
    TestValidator.predicate(
      "best day date has valid format",
      typia.is<string & tags.Format<"date">>(statistics.best_day_date),
    );
    TestValidator.predicate(
      "best day completions is not more than total",
      statistics.best_day_completions <= statistics.total_completions,
    );
  }

  // Validate date range information if present
  if (statistics.analysis_period_start_date !== undefined) {
    TestValidator.predicate(
      "analysis start date has valid format",
      typia.is<string & tags.Format<"date">>(
        statistics.analysis_period_start_date,
      ),
    );
  }

  if (statistics.analysis_period_end_date !== undefined) {
    TestValidator.predicate(
      "analysis end date has valid format",
      typia.is<string & tags.Format<"date">>(
        statistics.analysis_period_end_date,
      ),
    );
  }

  // Validate that all completed tasks are reflected in statistics
  TestValidator.predicate(
    "statistics reflect actual completions",
    statistics.total_completions === 15,
  );
  TestValidator.predicate(
    "statistics include all distinct completion days",
    statistics.distinct_days_with_completions >= 1,
  );

  // Verify data consistency across all optional fields
  if (
    statistics.average_daily_completions &&
    statistics.distinct_days_with_completions > 0
  ) {
    TestValidator.predicate(
      "average calculation is consistent",
      Math.abs(
        statistics.average_daily_completions -
          statistics.total_completions /
            statistics.distinct_days_with_completions,
      ) < 0.1,
    );
  }
}
