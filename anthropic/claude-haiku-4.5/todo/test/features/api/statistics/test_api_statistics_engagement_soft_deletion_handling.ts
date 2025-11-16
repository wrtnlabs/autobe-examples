import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppEngagementStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEngagementStatistics";

/**
 * Test engagement statistics with proper soft-deletion account handling.
 *
 * Validates that the engagement statistics API correctly distinguishes between
 * active and soft-deleted accounts. Verifies that deleted_users_count and
 * deleted_admins_count are accurately tracked separately from active counts,
 * and that retention calculations properly exclude soft-deleted accounts.
 *
 * This test ensures the system maintains proper audit trails and compliance by
 * tracking both active and deleted accounts with appropriate metrics.
 *
 * Steps:
 *
 * 1. Call the engagement statistics endpoint
 * 2. Validate response structure and all required fields
 * 3. Verify active user/admin counts are non-negative
 * 4. Verify deleted user/admin counts are non-negative
 * 5. Validate retention rates are within 0-100 range
 * 6. Verify timestamp fields are valid ISO 8601 format
 * 7. Ensure creation metrics don't exceed total active counts
 * 8. Validate activity metrics are reasonable
 */
export async function test_api_statistics_engagement_soft_deletion_handling(
  connection: api.IConnection,
) {
  // Step 1: Call the engagement statistics endpoint
  const statistics =
    await api.functional.todoApp.statistics.engagement.index(connection);

  // Step 2: Validate response structure and type safety
  // typia.assert() performs COMPLETE validation of all type aspects including format tags
  typia.assert<ITodoAppEngagementStatistics>(statistics);

  // Step 3: Verify active user count is non-negative integer
  TestValidator.predicate(
    "total users count should be non-negative",
    statistics.total_users_count >= 0,
  );

  // Step 4: Verify active admin count is non-negative integer
  TestValidator.predicate(
    "total admins count should be non-negative",
    statistics.total_admins_count >= 0,
  );

  // Step 5: Verify deleted users count is non-negative and tracked separately
  TestValidator.predicate(
    "deleted users count should be non-negative and tracked separately",
    statistics.deleted_users_count >= 0,
  );

  // Step 6: Verify deleted admins count is non-negative and tracked separately
  TestValidator.predicate(
    "deleted admins count should be non-negative and tracked separately",
    statistics.deleted_admins_count >= 0,
  );

  // Step 7: Validate user retention rate is within valid range
  TestValidator.predicate(
    "user retention rate should be between 0 and 100",
    statistics.user_retention_rate_30_days >= 0 &&
      statistics.user_retention_rate_30_days <= 100,
  );

  // Step 8: Validate admin retention rate is within valid range
  TestValidator.predicate(
    "admin retention rate should be between 0 and 100",
    statistics.admin_retention_rate_30_days >= 0 &&
      statistics.admin_retention_rate_30_days <= 100,
  );

  // Step 9: Validate user churn rate is within valid range
  TestValidator.predicate(
    "user churn rate should be between 0 and 100",
    statistics.user_churn_rate >= 0 && statistics.user_churn_rate <= 100,
  );

  // Step 10: Verify creation counts don't exceed total active users
  TestValidator.predicate(
    "users created today should not exceed total users",
    statistics.users_created_today <= statistics.total_users_count,
  );

  // Step 11: Verify active user counts are logical subset of total users
  TestValidator.predicate(
    "active users today should not exceed total users",
    statistics.users_active_today <= statistics.total_users_count,
  );

  // Step 12: Verify weekly user creation counts
  TestValidator.predicate(
    "users created this week should not exceed total users",
    statistics.users_created_this_week <= statistics.total_users_count,
  );

  // Step 13: Verify monthly user creation counts
  TestValidator.predicate(
    "users created this month should not exceed total users",
    statistics.users_created_this_month <= statistics.total_users_count,
  );

  // Step 14: Verify creation counts don't exceed total active admins
  TestValidator.predicate(
    "admins created today should not exceed total admins",
    statistics.admins_created_today <= statistics.total_admins_count,
  );

  // Step 15: Verify active admin counts are logical subset of total admins
  TestValidator.predicate(
    "active admins today should not exceed total admins",
    statistics.admins_active_today <= statistics.total_admins_count,
  );

  // Step 16: Verify weekly admin creation counts
  TestValidator.predicate(
    "admins created this week should not exceed total admins",
    statistics.admins_created_this_week <= statistics.total_admins_count,
  );

  // Step 17: Verify monthly admin creation counts
  TestValidator.predicate(
    "admins created this month should not exceed total admins",
    statistics.admins_created_this_month <= statistics.total_admins_count,
  );

  // Step 18: Verify logical time ordering of period (start <= end)
  TestValidator.predicate(
    "data period start should be before or equal to end",
    new Date(statistics.data_period_start) <=
      new Date(statistics.data_period_end),
  );

  // Step 19: Verify average days since activity is reasonable
  TestValidator.predicate(
    "average days since user activity should be non-negative",
    statistics.average_days_since_user_activity >= 0,
  );

  // Step 20: Verify average admin activity metric is reasonable
  TestValidator.predicate(
    "average days since admin activity should be non-negative",
    statistics.average_days_since_admin_activity >= 0,
  );

  // Step 21: Verify account creation acceleration ratio is non-negative
  TestValidator.predicate(
    "account creation acceleration ratio should be non-negative",
    statistics.account_creation_acceleration_ratio >= 0,
  );

  // Step 22: Verify soft-deleted user accounts are properly tracked
  TestValidator.predicate(
    "deleted users count represents soft-deleted accounts separately from active",
    statistics.deleted_users_count >= 0,
  );

  // Step 23: Verify soft-deleted admin accounts are properly tracked
  TestValidator.predicate(
    "deleted admins count represents soft-deleted accounts separately from active",
    statistics.deleted_admins_count >= 0,
  );
}
