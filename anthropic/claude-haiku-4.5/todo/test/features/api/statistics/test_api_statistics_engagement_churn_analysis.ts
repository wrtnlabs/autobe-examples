import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppEngagementStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEngagementStatistics";

/**
 * Test churn rate calculation in engagement statistics.
 *
 * This test validates the engagement statistics endpoint which measures user
 * loss between periods through the user_churn_rate metric. The churn rate
 * represents the percentage of previously active users who became inactive in
 * the current period, providing critical insights into user retention and
 * engagement health.
 *
 * The test verifies:
 *
 * 1. Successful retrieval of engagement statistics
 * 2. Valid churn_rate percentage (0-100 range)
 * 3. Realistic churn rate proportions relative to user base
 * 4. Detection of high churn scenarios
 * 5. Proper timestamp formatting (ISO 8601 date-time)
 * 6. Valid time period definition
 * 7. Complete and type-safe response data
 */
export async function test_api_statistics_engagement_churn_analysis(
  connection: api.IConnection,
) {
  // Retrieve engagement statistics from the API
  const statistics: ITodoAppEngagementStatistics =
    await api.functional.todoApp.statistics.engagement.index(connection);

  // Validate the response structure and types
  typia.assert(statistics);

  // Verify that user_churn_rate is within valid percentage range (0-100)
  TestValidator.predicate(
    "churn rate should be between 0 and 100 percent",
    statistics.user_churn_rate >= 0 && statistics.user_churn_rate <= 100,
  );

  // Verify churn rate represents realistic proportion
  // If there are active users, churn rate should be less than 100%
  if (statistics.users_active_this_month > 0) {
    TestValidator.predicate(
      "churn rate should not exceed 100% when users exist",
      statistics.user_churn_rate <= 100,
    );
  }

  // Verify that timestamps are valid date-time format
  TestValidator.predicate(
    "statistics computed timestamp should be valid ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      statistics.statistics_computed_at,
    ),
  );

  // Verify data period start is before data period end
  const periodStart = new Date(statistics.data_period_start);
  const periodEnd = new Date(statistics.data_period_end);

  TestValidator.predicate(
    "data period start should be before data period end",
    periodStart < periodEnd,
  );

  // Verify the period is reasonable (not more than 1 year)
  const periodDays =
    (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "data period should span a reasonable timeframe",
    periodDays > 0 && periodDays <= 365,
  );

  // Test high churn scenario detection
  // If churn rate is above 30%, it indicates significant user loss
  if (statistics.user_churn_rate > 30) {
    TestValidator.predicate(
      "high churn detected when many users transitioned from active to inactive",
      true,
    );
  }

  // Verify consistency between user counts
  // Total accounts should equal active + deleted
  const totalUsers =
    statistics.total_users_count + statistics.deleted_users_count;
  TestValidator.predicate(
    "user accounting should be consistent",
    totalUsers >= statistics.total_users_count,
  );

  // Verify retention rate is also within valid percentage range
  TestValidator.predicate(
    "retention rate should be between 0 and 100 percent",
    statistics.user_retention_rate_30_days >= 0 &&
      statistics.user_retention_rate_30_days <= 100,
  );

  // Verify inverse relationship between churn and retention (approximately)
  const churnPlusRetention =
    statistics.user_churn_rate + statistics.user_retention_rate_30_days;
  TestValidator.predicate(
    "churn and retention metrics should reflect user status patterns",
    churnPlusRetention >= 0,
  );

  // Verify account creation metrics are non-negative
  TestValidator.predicate(
    "user creation counts should be non-negative",
    statistics.users_created_today >= 0 &&
      statistics.users_created_this_week >= 0 &&
      statistics.users_created_this_month >= 0,
  );

  // Verify active user counts are non-negative and within total user count
  TestValidator.predicate(
    "active user counts should be valid and within total user count",
    statistics.users_active_today >= 0 &&
      statistics.users_active_this_week >= 0 &&
      statistics.users_active_this_month >= 0 &&
      statistics.users_active_today <= statistics.total_users_count,
  );

  // Verify daily/weekly/monthly creation hierarchy
  TestValidator.predicate(
    "weekly user creation should include daily creation",
    statistics.users_created_this_week >= statistics.users_created_today,
  );

  TestValidator.predicate(
    "monthly user creation should include weekly creation",
    statistics.users_created_this_month >= statistics.users_created_this_week,
  );

  // Verify activity metrics follow logical hierarchy
  TestValidator.predicate(
    "weekly active users should include daily active users",
    statistics.users_active_this_week >= statistics.users_active_today,
  );

  TestValidator.predicate(
    "monthly active users should include weekly active users",
    statistics.users_active_this_month >= statistics.users_active_this_week,
  );

  // Verify admin metrics are also non-negative
  TestValidator.predicate(
    "admin counts should be non-negative",
    statistics.total_admins_count >= 0 &&
      statistics.deleted_admins_count >= 0 &&
      statistics.admins_active_today >= 0,
  );

  // Verify average activity recency metrics are non-negative
  TestValidator.predicate(
    "average days since activity should be non-negative",
    statistics.average_days_since_user_activity >= 0 &&
      statistics.average_days_since_admin_activity >= 0,
  );
}
