import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppEngagementStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEngagementStatistics";

/**
 * Validates engagement and activity recency metrics for users and admins.
 *
 * Tests the engagement statistics endpoint to verify that average days since
 * last activity metrics are correctly calculated and returned. These metrics
 * provide insights into account engagement patterns and help identify inactive
 * user segments for targeted re-engagement strategies.
 *
 * The test validates:
 *
 * 1. API returns complete engagement statistics with proper data types
 * 2. Average days since user activity represents typical user engagement recency
 * 3. Average days since admin activity represents typical admin engagement recency
 * 4. Lower values indicate frequent engagement, higher values indicate dormancy
 * 5. Metrics provide actionable insights for user segment analysis
 * 6. All required fields are present with correct formats and value ranges
 * 7. Timestamp fields use ISO 8601 format
 * 8. Count metrics are non-negative integers
 * 9. Percentage metrics are within 0-100 range
 */
export async function test_api_statistics_engagement_recency_metrics(
  connection: api.IConnection,
) {
  // Retrieve engagement statistics from the API
  const statistics: ITodoAppEngagementStatistics =
    await api.functional.todoApp.statistics.engagement.index(connection);
  typia.assert(statistics);

  // Validate average_days_since_user_activity is non-negative
  TestValidator.predicate(
    "average_days_since_user_activity should be non-negative",
    statistics.average_days_since_user_activity >= 0,
  );

  // Validate average_days_since_admin_activity is non-negative
  TestValidator.predicate(
    "average_days_since_admin_activity should be non-negative",
    statistics.average_days_since_admin_activity >= 0,
  );

  // Validate total counts are non-negative
  TestValidator.predicate(
    "total_users_count should be non-negative",
    statistics.total_users_count >= 0,
  );

  TestValidator.predicate(
    "total_admins_count should be non-negative",
    statistics.total_admins_count >= 0,
  );

  // Validate deleted counts are non-negative
  TestValidator.predicate(
    "deleted_users_count should be non-negative",
    statistics.deleted_users_count >= 0,
  );

  TestValidator.predicate(
    "deleted_admins_count should be non-negative",
    statistics.deleted_admins_count >= 0,
  );

  // Validate active today counts are non-negative
  TestValidator.predicate(
    "users_active_today should be non-negative",
    statistics.users_active_today >= 0,
  );

  TestValidator.predicate(
    "admins_active_today should be non-negative",
    statistics.admins_active_today >= 0,
  );

  // Validate active this week counts are non-negative
  TestValidator.predicate(
    "users_active_this_week should be non-negative",
    statistics.users_active_this_week >= 0,
  );

  TestValidator.predicate(
    "admins_active_this_week should be non-negative",
    statistics.admins_active_this_week >= 0,
  );

  // Validate active this month counts are non-negative
  TestValidator.predicate(
    "users_active_this_month should be non-negative",
    statistics.users_active_this_month >= 0,
  );

  TestValidator.predicate(
    "admins_active_this_month should be non-negative",
    statistics.admins_active_this_month >= 0,
  );

  // Validate created today counts are non-negative
  TestValidator.predicate(
    "users_created_today should be non-negative",
    statistics.users_created_today >= 0,
  );

  TestValidator.predicate(
    "admins_created_today should be non-negative",
    statistics.admins_created_today >= 0,
  );

  // Validate created this week counts are non-negative
  TestValidator.predicate(
    "users_created_this_week should be non-negative",
    statistics.users_created_this_week >= 0,
  );

  TestValidator.predicate(
    "admins_created_this_week should be non-negative",
    statistics.admins_created_this_week >= 0,
  );

  // Validate created this month counts are non-negative
  TestValidator.predicate(
    "users_created_this_month should be non-negative",
    statistics.users_created_this_month >= 0,
  );

  TestValidator.predicate(
    "admins_created_this_month should be non-negative",
    statistics.admins_created_this_month >= 0,
  );

  // Validate retention rates are within percentage range
  TestValidator.predicate(
    "user_retention_rate_30_days should be between 0-100",
    statistics.user_retention_rate_30_days >= 0 &&
      statistics.user_retention_rate_30_days <= 100,
  );

  TestValidator.predicate(
    "admin_retention_rate_30_days should be between 0-100",
    statistics.admin_retention_rate_30_days >= 0 &&
      statistics.admin_retention_rate_30_days <= 100,
  );

  // Validate churn rate is within percentage range
  TestValidator.predicate(
    "user_churn_rate should be between 0-100",
    statistics.user_churn_rate >= 0 && statistics.user_churn_rate <= 100,
  );

  // Validate account creation acceleration ratio is non-negative
  TestValidator.predicate(
    "account_creation_acceleration_ratio should be non-negative",
    statistics.account_creation_acceleration_ratio >= 0,
  );

  // Validate data period end is after or equal to data period start
  TestValidator.predicate(
    "data_period_end should be after data_period_start",
    new Date(statistics.data_period_end) >=
      new Date(statistics.data_period_start),
  );

  // Validate statistics_computed_at is after or equal to data_period_end
  TestValidator.predicate(
    "statistics_computed_at should be after or equal to data_period_end",
    new Date(statistics.statistics_computed_at) >=
      new Date(statistics.data_period_end),
  );

  // Validate logical consistency: active users/admins should not exceed total users/admins
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

  // Validate that recency metrics provide actionable insights for identifying inactive users
  TestValidator.predicate(
    "metrics provide engagement insights with non-negative recency values",
    statistics.average_days_since_user_activity >= 0 &&
      statistics.average_days_since_admin_activity >= 0,
  );
}
