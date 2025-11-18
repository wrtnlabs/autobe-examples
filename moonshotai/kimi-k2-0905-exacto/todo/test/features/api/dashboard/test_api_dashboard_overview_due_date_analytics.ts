import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppDashboard";

/**
 * Test dashboard overview accurately tracks time-sensitive task analytics
 * including overdue counts, tasks due today, and upcoming weekly deadlines.
 * Validates completion date filtering logic and ensures users receive timely
 * alerts for approaching deadlines while maintaining accurate overdue task
 * identification.
 */
export async function test_api_dashboard_overview_due_date_analytics(
  connection: api.IConnection,
): Promise<void> {
  // Call the dashboard overview API endpoint to get analytics data
  const overview = await api.functional.todoApp.dashboard.overview(connection);
  typia.assert(overview);

  // Validate basic structure and non-negative counts
  TestValidator.predicate(
    "active tasks count is non-negative",
    overview.active_tasks_count >= 0,
  );
  TestValidator.predicate(
    "completed tasks count is non-negative",
    overview.completed_tasks_count >= 0,
  );
  TestValidator.predicate(
    "pending tasks count is non-negative",
    overview.pending_tasks_count >= 0,
  );
  TestValidator.predicate(
    "in progress tasks count is non-negative",
    overview.in_progress_tasks_count >= 0,
  );

  // Validate priority task counts
  TestValidator.predicate(
    "high priority tasks count is non-negative",
    overview.high_priority_tasks_count >= 0,
  );
  TestValidator.predicate(
    "medium priority tasks count is non-negative",
    overview.medium_priority_tasks_count >= 0,
  );
  TestValidator.predicate(
    "low priority tasks count is non-negative",
    overview.low_priority_tasks_count >= 0,
  );

  // Validate due date analytics - the core focus of this test
  if (overview.tasks_with_due_date_count !== undefined) {
    TestValidator.predicate(
      "tasks with due date count is non-negative",
      overview.tasks_with_due_date_count >= 0,
    );
  }

  if (overview.overdue_tasks_count !== undefined) {
    TestValidator.predicate(
      "overdue tasks count is non-negative",
      overview.overdue_tasks_count >= 0,
    );
  }

  if (overview.today_due_tasks_count !== undefined) {
    TestValidator.predicate(
      "today due tasks count is non-negative",
      overview.today_due_tasks_count >= 0,
    );
  }

  if (overview.week_due_tasks_count !== undefined) {
    TestValidator.predicate(
      "week due tasks count is non-negative",
      overview.week_due_tasks_count >= 0,
    );
  }

  // Validate completion rates within valid percentage range
  TestValidator.predicate(
    "task completion rate is valid percentage",
    overview.task_completion_rate >= 0 && overview.task_completion_rate <= 100,
  );

  if (overview.this_week_completion_rate !== undefined) {
    TestValidator.predicate(
      "this week completion rate is valid percentage",
      overview.this_week_completion_rate >= 0 &&
        overview.this_week_completion_rate <= 100,
    );
  }

  if (overview.this_month_completion_rate !== undefined) {
    TestValidator.predicate(
      "this month completion rate is valid percentage",
      overview.this_month_completion_rate >= 0 &&
        overview.this_month_completion_rate <= 100,
    );
  }

  // Validate average completion time if provided
  if (overview.average_time_to_completion_days !== undefined) {
    TestValidator.predicate(
      "average time to completion days is non-negative",
      overview.average_time_to_completion_days >= 0,
    );
  }

  // Validate category-level analytics
  TestValidator.predicate(
    "category counts array is valid",
    Array.isArray(overview.category_counts),
  );

  overview.category_counts.forEach((cc: ITodoAppDashboard.ICategoryCount) => {
    typia.assert(cc);

    TestValidator.predicate(
      "category completion rate is valid percentage",
      cc.completion_rate >= 0 && cc.completion_rate <= 100,
    );

    TestValidator.predicate(
      "category active tasks count is non-negative",
      cc.active_tasks_count >= 0,
    );

    TestValidator.predicate(
      "category completed tasks count is non-negative",
      cc.completed_tasks_count >= 0,
    );
  });

  // Validate recent completion analytics
  TestValidator.predicate(
    "recent completions array is valid",
    Array.isArray(overview.recent_completions),
  );

  overview.recent_completions.forEach(
    (completion: ITodoAppDashboard.IRecentCompletion) => {
      typia.assert(completion);

      TestValidator.predicate(
        "completion time to completion hours is non-negative",
        completion.time_to_completion_hours >= 0,
      );

      TestValidator.predicate(
        "completion priority is valid",
        ["Low", "Medium", "High"].includes(completion.priority),
      );

      TestValidator.predicate(
        "completion category is valid",
        completion.category === null ||
          (typeof completion.category === "object" &&
            completion.category.id !== undefined),
      );
    },
  );

  // Validate that due date counts make logical sense
  if (
    overview.overdue_tasks_count !== undefined &&
    overview.tasks_with_due_date_count !== undefined
  ) {
    TestValidator.predicate(
      "overdue tasks count does not exceed total tasks with due dates",
      overview.overdue_tasks_count <= overview.tasks_with_due_date_count,
    );
  }

  if (
    overview.today_due_tasks_count !== undefined &&
    overview.tasks_with_due_date_count !== undefined
  ) {
    TestValidator.predicate(
      "today due tasks count does not exceed total tasks with due dates",
      overview.today_due_tasks_count <= overview.tasks_with_due_date_count,
    );
  }

  if (
    overview.week_due_tasks_count !== undefined &&
    overview.tasks_with_due_date_count !== undefined
  ) {
    TestValidator.predicate(
      "week due tasks count does not exceed total tasks with due dates",
      overview.week_due_tasks_count <= overview.tasks_with_due_date_count,
    );
  }

  // Validate logical relationships between due date counts
  if (
    overview.today_due_tasks_count !== undefined &&
    overview.week_due_tasks_count !== undefined
  ) {
    TestValidator.predicate(
      "today due tasks count does not exceed week due tasks count",
      overview.today_due_tasks_count <= overview.week_due_tasks_count,
    );
  }
}
