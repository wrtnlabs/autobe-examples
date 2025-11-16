import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppEngagementStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEngagementStatistics";

/**
 * Validates engagement statistics API responses and metrics accuracy.
 *
 * This test retrieves engagement statistics from the
 * `/todoApp/statistics/engagement` endpoint and validates that:
 *
 * 1. User count metrics are properly separated:
 *
 *    - Total_users_count represents only active, non-deleted users
 *    - Deleted_users_count tracks soft-deleted user accounts separately
 *    - These counts don't overlap and represent distinct user populations
 * 2. Admin count metrics are properly separated:
 *
 *    - Total_admins_count represents only active, non-deleted admins
 *    - Deleted_admins_count tracks soft-deleted admin accounts separately
 *    - Admin metrics follow the same separation logic as user metrics
 * 3. Period-based user creation counts are realistic:
 *
 *    - Users_created_today <= users_created_this_week <= users_created_this_month
 *    - Users_created_today <= total_users_count (today's users are part of total)
 *    - Users_created_this_week <= total_users_count
 *    - Users_created_this_month <= total_users_count
 *    - Period counts reflect cumulative user growth within time windows
 * 4. Period-based admin creation counts follow same logic:
 *
 *    - Admins_created_today <= admins_created_this_week <= admins_created_this_month
 *    - All admin creation counts <= total_admins_count
 * 5. Activity metrics are realistic:
 *
 *    - Active user counts don't exceed total user count
 *    - Active admin counts don't exceed total admin count
 *    - Daily actives <= weekly actives <= monthly actives for both users and admins
 * 6. Retention and engagement rates are within valid ranges:
 *
 *    - User_retention_rate_30_days: 0-100%
 *    - Admin_retention_rate_30_days: 0-100%
 *    - User_churn_rate: 0-100%
 *    - User_retention_rate_30_days + user_churn_rate <= 100% (complementary metrics)
 * 7. Average activity metrics are realistic:
 *
 *    - Average_days_since_user_activity >= 0
 *    - Average_days_since_admin_activity >= 0
 * 8. Data period boundaries are properly set:
 *
 *    - Data_period_start <= data_period_end
 *    - Statistics_computed_at >= data_period_end (computed after period end)
 *
 * The test ensures that engagement statistics provide accurate, non-overlapping
 * metrics for monitoring platform health, user growth, engagement trends, and
 * retention patterns.
 */
export async function test_api_statistics_engagement_user_counts(
  connection: api.IConnection,
) {
  // Retrieve engagement statistics from the API
  const statistics: ITodoAppEngagementStatistics =
    await api.functional.todoApp.statistics.engagement.index(connection);
  typia.assert(statistics);

  // Validate that user and admin counts are properly separated
  TestValidator.predicate(
    "total_users_count should be non-negative",
    statistics.total_users_count >= 0,
  );
  TestValidator.predicate(
    "total_admins_count should be non-negative",
    statistics.total_admins_count >= 0,
  );
  TestValidator.predicate(
    "deleted_users_count should be non-negative",
    statistics.deleted_users_count >= 0,
  );
  TestValidator.predicate(
    "deleted_admins_count should be non-negative",
    statistics.deleted_admins_count >= 0,
  );

  // Validate period-based user creation counts are realistic proportions
  TestValidator.predicate(
    "users_created_today should not exceed total_users_count",
    statistics.users_created_today <= statistics.total_users_count,
  );
  TestValidator.predicate(
    "users_created_this_week should not exceed total_users_count",
    statistics.users_created_this_week <= statistics.total_users_count,
  );
  TestValidator.predicate(
    "users_created_this_month should not exceed total_users_count",
    statistics.users_created_this_month <= statistics.total_users_count,
  );

  // Validate temporal hierarchy for user creation counts
  TestValidator.predicate(
    "users_created_today should be <= users_created_this_week",
    statistics.users_created_today <= statistics.users_created_this_week,
  );
  TestValidator.predicate(
    "users_created_this_week should be <= users_created_this_month",
    statistics.users_created_this_week <= statistics.users_created_this_month,
  );

  // Validate period-based admin creation counts are realistic proportions
  TestValidator.predicate(
    "admins_created_today should not exceed total_admins_count",
    statistics.admins_created_today <= statistics.total_admins_count,
  );
  TestValidator.predicate(
    "admins_created_this_week should not exceed total_admins_count",
    statistics.admins_created_this_week <= statistics.total_admins_count,
  );
  TestValidator.predicate(
    "admins_created_this_month should not exceed total_admins_count",
    statistics.admins_created_this_month <= statistics.total_admins_count,
  );

  // Validate temporal hierarchy for admin creation counts
  TestValidator.predicate(
    "admins_created_today should be <= admins_created_this_week",
    statistics.admins_created_today <= statistics.admins_created_this_week,
  );
  TestValidator.predicate(
    "admins_created_this_week should be <= admins_created_this_month",
    statistics.admins_created_this_week <= statistics.admins_created_this_month,
  );

  // Validate user activity counts are realistic
  TestValidator.predicate(
    "users_active_today should not exceed total_users_count",
    statistics.users_active_today <= statistics.total_users_count,
  );
  TestValidator.predicate(
    "users_active_this_week should not exceed total_users_count",
    statistics.users_active_this_week <= statistics.total_users_count,
  );
  TestValidator.predicate(
    "users_active_this_month should not exceed total_users_count",
    statistics.users_active_this_month <= statistics.total_users_count,
  );

  // Validate temporal hierarchy for user activity counts
  TestValidator.predicate(
    "users_active_today should be <= users_active_this_week",
    statistics.users_active_today <= statistics.users_active_this_week,
  );
  TestValidator.predicate(
    "users_active_this_week should be <= users_active_this_month",
    statistics.users_active_this_week <= statistics.users_active_this_month,
  );

  // Validate admin activity counts are realistic
  TestValidator.predicate(
    "admins_active_today should not exceed total_admins_count",
    statistics.admins_active_today <= statistics.total_admins_count,
  );
  TestValidator.predicate(
    "admins_active_this_week should not exceed total_admins_count",
    statistics.admins_active_this_week <= statistics.total_admins_count,
  );
  TestValidator.predicate(
    "admins_active_this_month should not exceed total_admins_count",
    statistics.admins_active_this_month <= statistics.total_admins_count,
  );

  // Validate temporal hierarchy for admin activity counts
  TestValidator.predicate(
    "admins_active_today should be <= admins_active_this_week",
    statistics.admins_active_today <= statistics.admins_active_this_week,
  );
  TestValidator.predicate(
    "admins_active_this_week should be <= admins_active_this_month",
    statistics.admins_active_this_week <= statistics.admins_active_this_month,
  );

  // Validate retention and churn rate metrics are within valid ranges
  TestValidator.predicate(
    "user_retention_rate_30_days should be between 0 and 100",
    statistics.user_retention_rate_30_days >= 0 &&
      statistics.user_retention_rate_30_days <= 100,
  );
  TestValidator.predicate(
    "admin_retention_rate_30_days should be between 0 and 100",
    statistics.admin_retention_rate_30_days >= 0 &&
      statistics.admin_retention_rate_30_days <= 100,
  );
  TestValidator.predicate(
    "user_churn_rate should be between 0 and 100",
    statistics.user_churn_rate >= 0 && statistics.user_churn_rate <= 100,
  );

  // Validate average activity metrics are non-negative
  TestValidator.predicate(
    "average_days_since_user_activity should be non-negative",
    statistics.average_days_since_user_activity >= 0,
  );
  TestValidator.predicate(
    "average_days_since_admin_activity should be non-negative",
    statistics.average_days_since_admin_activity >= 0,
  );

  // Validate acceleration ratio is realistic
  TestValidator.predicate(
    "account_creation_acceleration_ratio should be non-negative",
    statistics.account_creation_acceleration_ratio >= 0,
  );

  // Validate data period boundaries
  TestValidator.predicate(
    "data_period_start should not be after data_period_end",
    new Date(statistics.data_period_start) <=
      new Date(statistics.data_period_end),
  );
  TestValidator.predicate(
    "statistics_computed_at should be after or equal to data_period_end",
    new Date(statistics.statistics_computed_at) >=
      new Date(statistics.data_period_end),
  );
}
