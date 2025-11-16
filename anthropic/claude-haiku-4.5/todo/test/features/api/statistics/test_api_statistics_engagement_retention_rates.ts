import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppEngagementStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEngagementStatistics";

/**
 * Validates the engagement statistics API response, focusing on retention rate
 * calculations.
 *
 * This test verifies that:
 *
 * 1. The retention rates are calculated correctly as percentages
 * 2. User and admin retention rates fall within the 0-100% range
 * 3. Active user counts do not exceed total user counts
 * 4. Admin retention rates are also within valid bounds
 * 5. All statistical metrics are logically consistent with each other
 *
 * The test calls the engagement statistics endpoint and validates the
 * mathematical relationships between active accounts, total accounts, and
 * calculated retention rates.
 */
export async function test_api_statistics_engagement_retention_rates(
  connection: api.IConnection,
) {
  // Fetch engagement statistics from the API
  const stats: ITodoAppEngagementStatistics =
    await api.functional.todoApp.statistics.engagement.index(connection);
  typia.assert(stats);

  // Validate that retention rates are within the 0-100% range
  TestValidator.predicate(
    "user retention rate should be between 0 and 100",
    stats.user_retention_rate_30_days >= 0 &&
      stats.user_retention_rate_30_days <= 100,
  );

  TestValidator.predicate(
    "admin retention rate should be between 0 and 100",
    stats.admin_retention_rate_30_days >= 0 &&
      stats.admin_retention_rate_30_days <= 100,
  );

  // Validate that active users in current month <= total users
  TestValidator.predicate(
    "active users this month should not exceed total users",
    stats.users_active_this_month <= stats.total_users_count,
  );

  TestValidator.predicate(
    "active admins this month should not exceed total admins",
    stats.admins_active_this_month <= stats.total_admins_count,
  );

  // Validate the mathematical consistency of retention rate calculation
  // Retention rate should be approximately: (active_this_month / total_count) * 100
  if (stats.total_users_count > 0) {
    const expectedUserRetention =
      (stats.users_active_this_month / stats.total_users_count) * 100;
    TestValidator.predicate(
      "user retention rate should match active users calculation",
      Math.abs(stats.user_retention_rate_30_days - expectedUserRetention) <
        0.01,
    );
  } else {
    // When there are no users, retention rate should be 0
    TestValidator.equals(
      "user retention rate should be 0 when no users exist",
      stats.user_retention_rate_30_days,
      0,
    );
  }

  if (stats.total_admins_count > 0) {
    const expectedAdminRetention =
      (stats.admins_active_this_month / stats.total_admins_count) * 100;
    TestValidator.predicate(
      "admin retention rate should match active admins calculation",
      Math.abs(stats.admin_retention_rate_30_days - expectedAdminRetention) <
        0.01,
    );
  } else {
    // When there are no admins, retention rate should be 0
    TestValidator.equals(
      "admin retention rate should be 0 when no admins exist",
      stats.admin_retention_rate_30_days,
      0,
    );
  }

  // Validate that the data period makes sense
  TestValidator.predicate(
    "data period start should be before or equal to data period end",
    new Date(stats.data_period_start) <= new Date(stats.data_period_end),
  );

  // Validate that statistics were computed within a reasonable timeframe
  TestValidator.predicate(
    "statistics computed timestamp should be between data period start and end",
    new Date(stats.statistics_computed_at) >=
      new Date(stats.data_period_start) &&
      new Date(stats.statistics_computed_at) <= new Date(stats.data_period_end),
  );

  // Validate non-negative counts for all metrics
  TestValidator.predicate(
    "total users count should be non-negative",
    stats.total_users_count >= 0,
  );

  TestValidator.predicate(
    "total admins count should be non-negative",
    stats.total_admins_count >= 0,
  );

  TestValidator.predicate(
    "users created this month should be non-negative",
    stats.users_created_this_month >= 0,
  );

  TestValidator.predicate(
    "admins created this month should be non-negative",
    stats.admins_created_this_month >= 0,
  );
}
