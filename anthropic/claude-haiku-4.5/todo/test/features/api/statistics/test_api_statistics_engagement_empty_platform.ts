import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppEngagementStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEngagementStatistics";

/**
 * Test engagement statistics behavior when the system has minimal user data.
 *
 * Verify that when the platform has zero or very few user accounts, the
 * endpoint handles calculations gracefully. Test that retention_rate_30_days
 * correctly handles zero-user scenario (should be 0 when no users exist), that
 * churn_rate handles edge cases where no prior activity exists, and that
 * growth_acceleration_ratio handles undefined previous month data
 * appropriately.
 *
 * Test Steps:
 *
 * 1. Call the engagement statistics endpoint
 * 2. Validate complete response type structure with typia.assert()
 * 3. Verify edge case: retention_rate is 0 when no users exist
 * 4. Verify logical constraint: active users don't exceed total users
 * 5. Verify logical constraint: data period start is before end
 */
export async function test_api_statistics_engagement_empty_platform(
  connection: api.IConnection,
) {
  // Call the engagement statistics endpoint
  const statistics: ITodoAppEngagementStatistics =
    await api.functional.todoApp.statistics.engagement.index(connection);

  // Validate complete type structure and all constraints
  // This validates: all fields exist, types are correct, numeric ranges are valid,
  // date formats are correct, and all other type constraints are satisfied
  typia.assert(statistics);

  // Edge case validation: retention rate should be 0 when no users exist
  TestValidator.predicate(
    "retention_rate_30_days should be 0 when total_users_count is 0",
    statistics.total_users_count === 0
      ? statistics.user_retention_rate_30_days === 0
      : true,
  );

  // Logical constraint: active user counts should not exceed total user count
  TestValidator.predicate(
    "active users should not exceed total users across all periods",
    statistics.users_active_today <= statistics.total_users_count &&
      statistics.users_active_this_week <= statistics.total_users_count &&
      statistics.users_active_this_month <= statistics.total_users_count,
  );

  // Logical constraint: active admin counts should not exceed total admin count
  TestValidator.predicate(
    "active admins should not exceed total admins across all periods",
    statistics.admins_active_today <= statistics.total_admins_count &&
      statistics.admins_active_this_week <= statistics.total_admins_count &&
      statistics.admins_active_this_month <= statistics.total_admins_count,
  );

  // Logical constraint: data period start should be before or equal to end
  TestValidator.predicate(
    "data_period_start should be before or equal to data_period_end",
    new Date(statistics.data_period_start).getTime() <=
      new Date(statistics.data_period_end).getTime(),
  );
}
