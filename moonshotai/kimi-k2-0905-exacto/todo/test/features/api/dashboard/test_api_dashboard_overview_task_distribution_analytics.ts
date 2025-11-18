import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppDashboard";

/**
 * Test dashboard overview captures accurate task distribution analytics.
 *
 * This test validates that the dashboard overview endpoint returns
 * comprehensive task analytics including priority distributions, completion
 * statistics, category breakdowns, and trend insights that accurately reflect
 * user productivity patterns and task management effectiveness.
 *
 * Test validates:
 *
 * 1. API endpoint accessibility and response structure
 * 2. Task distribution across priority levels (High/Medium/Low)
 * 3. Active vs completed task ratios for productivity assessment
 * 4. Category-based task analytics and completion rates
 * 5. Optional due date analytics when available
 * 6. Completion rates are within valid business ranges (0-100%)
 * 7. Recent completion trends provide meaningful insights
 */
export async function test_api_dashboard_overview_task_distribution_analytics(
  connection: api.IConnection,
) {
  // Retrieve dashboard overview with comprehensive task analytics
  const overview: ITodoAppDashboard.IOverview =
    await api.functional.todoApp.dashboard.overview(connection);

  // Validate response structure and type compliance
  typia.assert(overview);

  // Validate core task counters are non-negative
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

  // Validate priority distribution counters
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

  // Validate completion rate is within valid business range (0-100%)
  TestValidator.predicate(
    "overall completion rate is valid",
    overview.task_completion_rate >= 0 && overview.task_completion_rate <= 100,
  );

  // Test optional completion rates when present
  if (overview.this_week_completion_rate !== undefined) {
    TestValidator.predicate(
      "weekly completion rate is valid",
      overview.this_week_completion_rate >= 0 &&
        overview.this_week_completion_rate <= 100,
    );
  }
  if (overview.this_month_completion_rate !== undefined) {
    TestValidator.predicate(
      "monthly completion rate is valid",
      overview.this_month_completion_rate >= 0 &&
        overview.this_month_completion_rate <= 100,
    );
  }

  // Validate optional due date analytics when present
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

  // Validate optional average completion time when present
  if (overview.average_time_to_completion_days !== undefined) {
    TestValidator.predicate(
      "average completion time is non-negative",
      overview.average_time_to_completion_days >= 0,
    );
  }

  // Validate category breakdown structure
  TestValidator.predicate(
    "category counts array is valid",
    Array.isArray(overview.category_counts),
  );
  overview.category_counts.forEach((categoryCount, index) => {
    // Validate individual category count entries
    const categoryIndex = index;
    TestValidator.predicate(
      `category count ${categoryIndex} has valid category info`,
      categoryCount.category !== null && categoryCount.category !== undefined,
    );
    TestValidator.predicate(
      `category count ${categoryIndex} has non-negative active tasks`,
      categoryCount.active_tasks_count >= 0,
    );
    TestValidator.predicate(
      `category count ${categoryIndex} has non-negative completed tasks`,
      categoryCount.completed_tasks_count >= 0,
    );
    TestValidator.predicate(
      `category count ${categoryIndex} has valid completion rate`,
      categoryCount.completion_rate >= 0 &&
        categoryCount.completion_rate <= 100,
    );
  });

  // Validate recent completions structure
  TestValidator.predicate(
    "recent completions array is valid",
    Array.isArray(overview.recent_completions),
  );
  overview.recent_completions.forEach((completion, index) => {
    const completionIndex = index;
    TestValidator.predicate(
      `recent completion ${completionIndex} has valid id`,
      completion.id !== null && completion.id !== undefined,
    );
    TestValidator.predicate(
      `recent completion ${completionIndex} has valid task id`,
      completion.task_id !== null && completion.task_id !== undefined,
    );
    TestValidator.predicate(
      `recent completion ${completionIndex} has valid title`,
      completion.title !== null && completion.title !== undefined,
    );
    TestValidator.predicate(
      `recent completion ${completionIndex} has valid priority`,
      completion.priority !== null && completion.priority !== undefined,
    );
    // Validate priority enum values
    TestValidator.predicate(
      `recent completion ${completionIndex} priority is Low`,
      completion.priority === "Low" ||
        completion.priority === "Medium" ||
        completion.priority === "High",
    );
    TestValidator.predicate(
      `recent completion ${completionIndex} has valid completion time`,
      completion.completed_at !== null && completion.completed_at !== undefined,
    );
    TestValidator.predicate(
      `recent completion ${completionIndex} has non-negative completion hours`,
      completion.time_to_completion_hours >= 0,
    );
  });

  // Validate task distribution logic - total priority tasks should not exceed total tasks
  const totalPriorityTasks =
    overview.high_priority_tasks_count +
    overview.medium_priority_tasks_count +
    overview.low_priority_tasks_count;
  TestValidator.predicate(
    "total priority tasks do not exceed active tasks",
    totalPriorityTasks <=
      overview.active_tasks_count + overview.completed_tasks_count,
  );

  // Validate status breakdown consistency
  const totalStatusTasks =
    overview.pending_tasks_count +
    overview.in_progress_tasks_count +
    overview.completed_tasks_count;
  TestValidator.predicate(
    "total status tasks equal total tasks",
    totalStatusTasks ===
      overview.active_tasks_count + overview.completed_tasks_count,
  );
}
