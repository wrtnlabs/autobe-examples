import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppEngagementStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEngagementStatistics";

/**
 * Test successful retrieval of aggregate engagement statistics.
 *
 * This test validates that the engagement statistics endpoint returns
 * comprehensive metrics about user and admin accounts in the system. It
 * verifies that all required fields are present and contain realistic numeric
 * values representing account creation trends, activity levels, retention
 * rates, churn rates, and growth acceleration ratios.
 *
 * The test performs the following:
 *
 * 1. Call the engagement statistics endpoint
 * 2. Validate the response is properly typed
 * 3. Verify all required fields are present
 * 4. Confirm numeric values are within realistic ranges
 * 5. Validate timestamp fields are in proper ISO 8601 format
 * 6. Check that creation counts increase logically (today <= week <= month)
 * 7. Verify activity metrics follow logical relationships
 * 8. Confirm retention and churn rates are percentages (0-100)
 * 9. Validate acceleration ratio is a positive number
 */
export async function test_api_statistics_engagement_retrieval_success(
  connection: api.IConnection,
) {
  // Call the engagement statistics endpoint
  const statistics: ITodoAppEngagementStatistics =
    await api.functional.todoApp.statistics.engagement.index(connection);
  typia.assert(statistics);

  // Verify total user and admin counts are non-negative integers
  TestValidator.predicate(
    "total_users_count is non-negative",
    statistics.total_users_count >= 0,
  );
  TestValidator.predicate(
    "total_admins_count is non-negative",
    statistics.total_admins_count >= 0,
  );
  TestValidator.predicate(
    "deleted_users_count is non-negative",
    statistics.deleted_users_count >= 0,
  );
  TestValidator.predicate(
    "deleted_admins_count is non-negative",
    statistics.deleted_admins_count >= 0,
  );

  // Verify creation counts are non-negative and logically ordered
  TestValidator.predicate(
    "users_created_today is non-negative",
    statistics.users_created_today >= 0,
  );
  TestValidator.predicate(
    "users_created_this_week >= users_created_today",
    statistics.users_created_this_week >= statistics.users_created_today,
  );
  TestValidator.predicate(
    "users_created_this_month >= users_created_this_week",
    statistics.users_created_this_month >= statistics.users_created_this_week,
  );

  TestValidator.predicate(
    "admins_created_today is non-negative",
    statistics.admins_created_today >= 0,
  );
  TestValidator.predicate(
    "admins_created_this_week >= admins_created_today",
    statistics.admins_created_this_week >= statistics.admins_created_today,
  );
  TestValidator.predicate(
    "admins_created_this_month >= admins_created_this_week",
    statistics.admins_created_this_month >= statistics.admins_created_this_week,
  );

  // Verify active user counts are non-negative and logically ordered
  TestValidator.predicate(
    "users_active_today is non-negative",
    statistics.users_active_today >= 0,
  );
  TestValidator.predicate(
    "users_active_this_week >= users_active_today",
    statistics.users_active_this_week >= statistics.users_active_today,
  );
  TestValidator.predicate(
    "users_active_this_month >= users_active_this_week",
    statistics.users_active_this_month >= statistics.users_active_this_week,
  );

  // Verify active user counts don't exceed total user counts
  TestValidator.predicate(
    "users_active_today <= total_users_count",
    statistics.users_active_today <= statistics.total_users_count,
  );
  TestValidator.predicate(
    "users_active_this_week <= total_users_count",
    statistics.users_active_this_week <= statistics.total_users_count,
  );
  TestValidator.predicate(
    "users_active_this_month <= total_users_count",
    statistics.users_active_this_month <= statistics.total_users_count,
  );

  // Verify active admin counts are non-negative and logically ordered
  TestValidator.predicate(
    "admins_active_today is non-negative",
    statistics.admins_active_today >= 0,
  );
  TestValidator.predicate(
    "admins_active_this_week >= admins_active_today",
    statistics.admins_active_this_week >= statistics.admins_active_today,
  );
  TestValidator.predicate(
    "admins_active_this_month >= admins_active_this_week",
    statistics.admins_active_this_month >= statistics.admins_active_this_week,
  );

  // Verify active admin counts don't exceed total admin counts
  TestValidator.predicate(
    "admins_active_today <= total_admins_count",
    statistics.admins_active_today <= statistics.total_admins_count,
  );
  TestValidator.predicate(
    "admins_active_this_week <= total_admins_count",
    statistics.admins_active_this_week <= statistics.total_admins_count,
  );
  TestValidator.predicate(
    "admins_active_this_month <= total_admins_count",
    statistics.admins_active_this_month <= statistics.total_admins_count,
  );

  // Verify average days since activity are non-negative
  TestValidator.predicate(
    "average_days_since_user_activity is non-negative",
    statistics.average_days_since_user_activity >= 0,
  );
  TestValidator.predicate(
    "average_days_since_admin_activity is non-negative",
    statistics.average_days_since_admin_activity >= 0,
  );

  // Verify retention rates are valid percentages (0-100)
  TestValidator.predicate(
    "user_retention_rate_30_days in valid range",
    statistics.user_retention_rate_30_days >= 0 &&
      statistics.user_retention_rate_30_days <= 100,
  );
  TestValidator.predicate(
    "admin_retention_rate_30_days in valid range",
    statistics.admin_retention_rate_30_days >= 0 &&
      statistics.admin_retention_rate_30_days <= 100,
  );

  // Verify churn rate is a valid percentage (0-100)
  TestValidator.predicate(
    "user_churn_rate in valid range",
    statistics.user_churn_rate >= 0 && statistics.user_churn_rate <= 100,
  );

  // Verify acceleration ratio is positive
  TestValidator.predicate(
    "account_creation_acceleration_ratio is positive",
    statistics.account_creation_acceleration_ratio > 0,
  );

  // Verify timestamp fields are valid ISO 8601 datetime strings
  TestValidator.predicate(
    "statistics_computed_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      statistics.statistics_computed_at,
    ),
  );
  TestValidator.predicate(
    "data_period_start is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      statistics.data_period_start,
    ),
  );
  TestValidator.predicate(
    "data_period_end is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      statistics.data_period_end,
    ),
  );

  // Verify time period ordering
  const computedAt = new Date(statistics.statistics_computed_at);
  const periodStart = new Date(statistics.data_period_start);
  const periodEnd = new Date(statistics.data_period_end);
  TestValidator.predicate(
    "data_period_start is before data_period_end",
    periodStart < periodEnd,
  );
  TestValidator.predicate(
    "data_period_end is before or equal to statistics_computed_at",
    periodEnd <= computedAt,
  );
}
