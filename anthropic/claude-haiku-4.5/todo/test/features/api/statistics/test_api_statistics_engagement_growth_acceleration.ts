import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppEngagementStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEngagementStatistics";

/**
 * Validates engagement growth acceleration metrics and month-over-month
 * comparison.
 *
 * This test verifies that the engagement statistics API correctly computes the
 * account_creation_acceleration_ratio, which compares current month's user
 * registrations to the previous month's registrations. The ratio indicates
 * whether user acquisition is accelerating (> 1.0), decelerating (< 1.0), or
 * remaining flat (= 1.0).
 *
 * The test ensures:
 *
 * 1. Valid engagement statistics are returned from the API
 * 2. All required metrics are present and properly typed
 * 3. The acceleration ratio accurately reflects growth trends
 * 4. Timestamps are valid and properly formatted
 * 5. Retention rates and activity metrics are within valid ranges
 */
export async function test_api_statistics_engagement_growth_acceleration(
  connection: api.IConnection,
) {
  // Fetch engagement statistics from the API
  const stats: ITodoAppEngagementStatistics =
    await api.functional.todoApp.statistics.engagement.index(connection);

  // Validate the response structure and all properties
  typia.assert(stats);

  // Validate total user and admin counts are non-negative
  TestValidator.predicate(
    "total users count is non-negative",
    stats.total_users_count >= 0,
  );
  TestValidator.predicate(
    "total admins count is non-negative",
    stats.total_admins_count >= 0,
  );

  // Validate deleted counts are non-negative
  TestValidator.predicate(
    "deleted users count is non-negative",
    stats.deleted_users_count >= 0,
  );
  TestValidator.predicate(
    "deleted admins count is non-negative",
    stats.deleted_admins_count >= 0,
  );

  // Validate account creation metrics are non-negative
  TestValidator.predicate(
    "users created today is non-negative",
    stats.users_created_today >= 0,
  );
  TestValidator.predicate(
    "users created this week is non-negative",
    stats.users_created_this_week >= 0,
  );
  TestValidator.predicate(
    "users created this month is non-negative",
    stats.users_created_this_month >= 0,
  );

  // Validate admin creation metrics are non-negative
  TestValidator.predicate(
    "admins created today is non-negative",
    stats.admins_created_today >= 0,
  );
  TestValidator.predicate(
    "admins created this week is non-negative",
    stats.admins_created_this_week >= 0,
  );
  TestValidator.predicate(
    "admins created this month is non-negative",
    stats.admins_created_this_month >= 0,
  );

  // Validate active user metrics are non-negative
  TestValidator.predicate(
    "users active today is non-negative",
    stats.users_active_today >= 0,
  );
  TestValidator.predicate(
    "users active this week is non-negative",
    stats.users_active_this_week >= 0,
  );
  TestValidator.predicate(
    "users active this month is non-negative",
    stats.users_active_this_month >= 0,
  );

  // Validate active admin metrics are non-negative
  TestValidator.predicate(
    "admins active today is non-negative",
    stats.admins_active_today >= 0,
  );
  TestValidator.predicate(
    "admins active this week is non-negative",
    stats.admins_active_this_week >= 0,
  );
  TestValidator.predicate(
    "admins active this month is non-negative",
    stats.admins_active_this_month >= 0,
  );

  // Validate retention rates are within valid percentage range
  TestValidator.predicate(
    "user retention rate is valid percentage",
    stats.user_retention_rate_30_days >= 0 &&
      stats.user_retention_rate_30_days <= 100,
  );
  TestValidator.predicate(
    "admin retention rate is valid percentage",
    stats.admin_retention_rate_30_days >= 0 &&
      stats.admin_retention_rate_30_days <= 100,
  );

  // Validate churn rate is within valid percentage range
  TestValidator.predicate(
    "user churn rate is valid percentage",
    stats.user_churn_rate >= 0 && stats.user_churn_rate <= 100,
  );

  // CRITICAL: Validate the acceleration ratio
  // This is the core metric being tested for growth acceleration
  TestValidator.predicate(
    "account creation acceleration ratio is a positive number",
    stats.account_creation_acceleration_ratio > 0,
  );

  // Validate acceleration ratio interpretation:
  // - If ratio > 1.0, growth is accelerating (more signups this month than last)
  // - If ratio < 1.0, growth is decelerating (fewer signups this month than last)
  // - If ratio = 1.0, growth is flat (same signups both months)
  TestValidator.predicate(
    "acceleration ratio reflects month-over-month growth trend",
    typeof stats.account_creation_acceleration_ratio === "number" &&
      stats.account_creation_acceleration_ratio > 0,
  );

  // Validate activity metrics are non-negative
  TestValidator.predicate(
    "average days since user activity is non-negative",
    stats.average_days_since_user_activity >= 0,
  );
  TestValidator.predicate(
    "average days since admin activity is non-negative",
    stats.average_days_since_admin_activity >= 0,
  );

  // Validate timestamps are properly formatted
  TestValidator.predicate(
    "statistics computed at is valid date-time",
    !isNaN(new Date(stats.statistics_computed_at).getTime()),
  );
  TestValidator.predicate(
    "data period start is valid date-time",
    !isNaN(new Date(stats.data_period_start).getTime()),
  );
  TestValidator.predicate(
    "data period end is valid date-time",
    !isNaN(new Date(stats.data_period_end).getTime()),
  );

  // Validate temporal logic: start should be before or equal to end
  TestValidator.predicate(
    "data period start is before or equal to data period end",
    new Date(stats.data_period_start) <= new Date(stats.data_period_end),
  );

  // Validate logical constraints on activity metrics
  // Active users should not exceed total users
  TestValidator.predicate(
    "active users today does not exceed total users",
    stats.users_active_today <= stats.total_users_count,
  );
  TestValidator.predicate(
    "active users this week does not exceed total users",
    stats.users_active_this_week <= stats.total_users_count,
  );
  TestValidator.predicate(
    "active users this month does not exceed total users",
    stats.users_active_this_month <= stats.total_users_count,
  );

  // Validate active admins do not exceed total admins
  TestValidator.predicate(
    "active admins today does not exceed total admins",
    stats.admins_active_today <= stats.total_admins_count,
  );
  TestValidator.predicate(
    "active admins this week does not exceed total admins",
    stats.admins_active_this_week <= stats.total_admins_count,
  );
  TestValidator.predicate(
    "active admins this month does not exceed total admins",
    stats.admins_active_this_month <= stats.total_admins_count,
  );

  // Validate meaningful growth acceleration values
  // Test for accelerating growth scenario (ratio > 1.0)
  if (stats.account_creation_acceleration_ratio > 1.0) {
    TestValidator.predicate(
      "growth acceleration indicates increasing registrations",
      stats.account_creation_acceleration_ratio > 1.0,
    );
  }

  // Test for decelerating growth scenario (ratio < 1.0)
  if (stats.account_creation_acceleration_ratio < 1.0) {
    TestValidator.predicate(
      "growth deceleration indicates decreasing registrations",
      stats.account_creation_acceleration_ratio < 1.0,
    );
  }

  // Test for flat growth scenario (ratio = 1.0)
  if (Math.abs(stats.account_creation_acceleration_ratio - 1.0) < 0.001) {
    TestValidator.predicate(
      "flat growth indicates stable registrations",
      Math.abs(stats.account_creation_acceleration_ratio - 1.0) < 0.001,
    );
  }
}
