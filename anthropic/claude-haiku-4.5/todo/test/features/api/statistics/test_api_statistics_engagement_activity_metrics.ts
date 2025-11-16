import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppEngagementStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEngagementStatistics";

/**
 * Test the accuracy of user and admin activity tracking metrics.
 *
 * This test validates the engagement statistics API endpoint which provides
 * aggregated metrics about user and admin account activity, including:
 *
 * - Total and deleted user/admin counts
 * - User/admin creation trends (daily, weekly, monthly)
 * - Active user/admin counts based on last_active_at timestamps
 * - User retention and churn rates
 * - Account creation acceleration ratio
 * - Average days since last activity for users and admins
 *
 * The test verifies that:
 *
 * 1. Activity metrics maintain logical hierarchies (daily <= weekly <= monthly)
 * 2. Active counts never exceed total populations
 * 3. All retention/churn rates are valid percentages (0-100)
 * 4. Timestamps are properly formatted and ordered
 * 5. All numeric metrics have reasonable values
 */
export async function test_api_statistics_engagement_activity_metrics(
  connection: api.IConnection,
) {
  const stats: ITodoAppEngagementStatistics =
    await api.functional.todoApp.statistics.engagement.index(connection);
  typia.assert(stats);

  // Test 1: Validate user activity hierarchy (daily <= weekly <= monthly)
  TestValidator.predicate(
    "users active today should not exceed users active this week",
    stats.users_active_today <= stats.users_active_this_week,
  );
  TestValidator.predicate(
    "users active this week should not exceed users active this month",
    stats.users_active_this_week <= stats.users_active_this_month,
  );

  // Test 2: Validate admin activity hierarchy (daily <= weekly <= monthly)
  TestValidator.predicate(
    "admins active today should not exceed admins active this week",
    stats.admins_active_today <= stats.admins_active_this_week,
  );
  TestValidator.predicate(
    "admins active this week should not exceed admins active this month",
    stats.admins_active_this_week <= stats.admins_active_this_month,
  );

  // Test 3: Validate user active counts don't exceed total users
  TestValidator.predicate(
    "users active today should not exceed total users count",
    stats.users_active_today <= stats.total_users_count,
  );
  TestValidator.predicate(
    "users active this week should not exceed total users count",
    stats.users_active_this_week <= stats.total_users_count,
  );
  TestValidator.predicate(
    "users active this month should not exceed total users count",
    stats.users_active_this_month <= stats.total_users_count,
  );

  // Test 4: Validate admin active counts don't exceed total admins
  TestValidator.predicate(
    "admins active today should not exceed total admins count",
    stats.admins_active_today <= stats.total_admins_count,
  );
  TestValidator.predicate(
    "admins active this week should not exceed total admins count",
    stats.admins_active_this_week <= stats.total_admins_count,
  );
  TestValidator.predicate(
    "admins active this month should not exceed total admins count",
    stats.admins_active_this_month <= stats.total_admins_count,
  );

  // Test 5: Validate user creation hierarchy (daily <= weekly <= monthly)
  TestValidator.predicate(
    "users created today should not exceed users created this week",
    stats.users_created_today <= stats.users_created_this_week,
  );
  TestValidator.predicate(
    "users created this week should not exceed users created this month",
    stats.users_created_this_week <= stats.users_created_this_month,
  );

  // Test 6: Validate admin creation hierarchy (daily <= weekly <= monthly)
  TestValidator.predicate(
    "admins created today should not exceed admins created this week",
    stats.admins_created_today <= stats.admins_created_this_week,
  );
  TestValidator.predicate(
    "admins created this week should not exceed admins created this month",
    stats.admins_created_this_week <= stats.admins_created_this_month,
  );

  // Test 7: Validate retention rates are valid percentages
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

  // Test 8: Validate churn rates are valid percentages
  TestValidator.predicate(
    "user churn rate should be between 0 and 100",
    stats.user_churn_rate >= 0 && stats.user_churn_rate <= 100,
  );

  // Test 9: Validate average days since activity are non-negative
  TestValidator.predicate(
    "average days since user activity should be non-negative",
    stats.average_days_since_user_activity >= 0,
  );
  TestValidator.predicate(
    "average days since admin activity should be non-negative",
    stats.average_days_since_admin_activity >= 0,
  );

  // Test 10: Validate account creation acceleration ratio is positive
  TestValidator.predicate(
    "account creation acceleration ratio should be positive",
    stats.account_creation_acceleration_ratio > 0,
  );

  // Test 11: Validate all counts are non-negative integers
  TestValidator.predicate(
    "total users count should be non-negative",
    stats.total_users_count >= 0,
  );
  TestValidator.predicate(
    "total admins count should be non-negative",
    stats.total_admins_count >= 0,
  );
  TestValidator.predicate(
    "deleted users count should be non-negative",
    stats.deleted_users_count >= 0,
  );
  TestValidator.predicate(
    "deleted admins count should be non-negative",
    stats.deleted_admins_count >= 0,
  );

  // Test 12: Validate timestamps are properly ordered
  const computedAt = new Date(stats.statistics_computed_at);
  const periodStart = new Date(stats.data_period_start);
  const periodEnd = new Date(stats.data_period_end);

  TestValidator.predicate(
    "data period start should not be after period end",
    periodStart <= periodEnd,
  );
  TestValidator.predicate(
    "statistics computed timestamp should be after or equal to period end",
    computedAt >= periodEnd,
  );

  // Test 13: Validate that creation counts don't exceed total populations
  TestValidator.predicate(
    "users created this month should not exceed total users plus deleted users",
    stats.users_created_this_month <=
      stats.total_users_count + stats.deleted_users_count,
  );
  TestValidator.predicate(
    "admins created this month should not exceed total admins plus deleted admins",
    stats.admins_created_this_month <=
      stats.total_admins_count + stats.deleted_admins_count,
  );
}
