import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppDashboard";

/**
 * Test Public Access to Dashboard Overview
 *
 * This test validates that the dashboard overview endpoint is publicly
 * accessible without requiring authentication, providing essential task
 * management statistics and productivity metrics to guest users.
 *
 * The test ensures that unauthenticated users can access:
 *
 * - Task distribution across different statuses (active, pending, completed,
 *   in-progress)
 * - Priority level counts and completion rate metrics
 * - Due date analytics for effective task management
 * - Recent completion history and time-to-completion tracking
 * - Category-based task organization insights
 */
export async function test_api_dashboard_overview_public_access(
  connection: api.IConnection,
) {
  // Retrieve dashboard overview - this endpoint is publicly accessible
  const overview: ITodoAppDashboard.IOverview =
    await api.functional.todoApp.dashboard.overview(connection);

  // Validate the response schema
  typia.assert(overview);

  // TestValidator validations for public dashboard functionality
  TestValidator.predicate(
    "active tasks count should be non-negative",
    overview.active_tasks_count >= 0,
  );

  TestValidator.predicate(
    "completed tasks count should be non-negative",
    overview.completed_tasks_count >= 0,
  );

  TestValidator.predicate(
    "pending tasks count should be non-negative",
    overview.pending_tasks_count >= 0,
  );

  TestValidator.predicate(
    "in-progress tasks count should be non-negative",
    overview.in_progress_tasks_count >= 0,
  );

  TestValidator.predicate(
    "completion rate should be valid percentage",
    overview.task_completion_rate >= 0 && overview.task_completion_rate <= 100,
  );

  TestValidator.predicate(
    "category counts should be an array",
    Array.isArray(overview.category_counts),
  );

  TestValidator.predicate(
    "recent completions should be an array",
    Array.isArray(overview.recent_completions),
  );

  // Validate optional due date metrics if present
  if (overview.today_due_tasks_count !== undefined) {
    TestValidator.predicate(
      "today due tasks count should be non-negative",
      overview.today_due_tasks_count >= 0,
    );
  }

  if (overview.week_due_tasks_count !== undefined) {
    TestValidator.predicate(
      "week due tasks count should be non-negative",
      overview.week_due_tasks_count >= 0,
    );
  }
}
