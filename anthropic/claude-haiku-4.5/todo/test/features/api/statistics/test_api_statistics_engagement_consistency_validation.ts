import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppEngagementStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEngagementStatistics";

/**
 * Test mathematical consistency across all engagement metrics.
 *
 * This test validates that the engagement statistics API returns data where all
 * numerical relationships are mathematically consistent and follow business
 * logic constraints. It verifies:
 *
 * 1. Total counts are consistent: total_users_count + deleted_users_count should
 *    represent the complete user base
 * 2. Active user counts cannot exceed total user counts
 * 3. Created user counts cannot exceed total user counts
 * 4. Retention rates maintain logical relationship with active users
 * 5. All temporal metrics (created_this_month, active_this_month) are logically
 *    bounded by total counts
 * 6. Average activity days are non-negative values
 * 7. Similar consistency checks apply to admin metrics
 *
 * These validation rules ensure data integrity and mathematical coherence in
 * the engagement reporting system.
 */
export async function test_api_statistics_engagement_consistency_validation(
  connection: api.IConnection,
) {
  // Fetch engagement statistics
  const stats: ITodoAppEngagementStatistics =
    await api.functional.todoApp.statistics.engagement.index(connection);
  typia.assert(stats);

  // ===== USER CONSISTENCY VALIDATIONS =====

  // 1. Total users and deleted users should be non-negative
  TestValidator.predicate(
    "total_users_count should be non-negative",
    stats.total_users_count >= 0,
  );

  TestValidator.predicate(
    "deleted_users_count should be non-negative",
    stats.deleted_users_count >= 0,
  );

  // 2. Active users today should not exceed total users
  TestValidator.predicate(
    "users_active_today should not exceed total_users_count",
    stats.users_active_today <= stats.total_users_count,
  );

  // 3. Active users this week should not exceed total users
  TestValidator.predicate(
    "users_active_this_week should not exceed total_users_count",
    stats.users_active_this_week <= stats.total_users_count,
  );

  // 4. Active users this month should not exceed total users
  TestValidator.predicate(
    "users_active_this_month should not exceed total_users_count",
    stats.users_active_this_month <= stats.total_users_count,
  );

  // 5. Created users today should not exceed total users
  TestValidator.predicate(
    "users_created_today should not exceed total_users_count",
    stats.users_created_today <= stats.total_users_count,
  );

  // 6. Created users this week should not exceed total users
  TestValidator.predicate(
    "users_created_this_week should not exceed total_users_count",
    stats.users_created_this_week <= stats.total_users_count,
  );

  // 7. Created users this month should not exceed total users
  TestValidator.predicate(
    "users_created_this_month should not exceed total_users_count",
    stats.users_created_this_month <= stats.total_users_count,
  );

  // 8. Temporal consistency: created_today <= created_this_week
  TestValidator.predicate(
    "users_created_today should not exceed users_created_this_week",
    stats.users_created_today <= stats.users_created_this_week,
  );

  // 9. Temporal consistency: created_this_week <= created_this_month
  TestValidator.predicate(
    "users_created_this_week should not exceed users_created_this_month",
    stats.users_created_this_week <= stats.users_created_this_month,
  );

  // 10. Temporal consistency: active_today <= active_this_week
  TestValidator.predicate(
    "users_active_today should not exceed users_active_this_week",
    stats.users_active_today <= stats.users_active_this_week,
  );

  // 11. Temporal consistency: active_this_week <= active_this_month
  TestValidator.predicate(
    "users_active_this_week should not exceed users_active_this_month",
    stats.users_active_this_week <= stats.users_active_this_month,
  );

  // 12. Retention rate should be between 0 and 100
  TestValidator.predicate(
    "user_retention_rate_30_days should be between 0 and 100",
    stats.user_retention_rate_30_days >= 0 &&
      stats.user_retention_rate_30_days <= 100,
  );

  // 13. When total users > 0, retention rate logic check
  // retention_rate = (active_this_month / total_users_count) * 100
  if (stats.total_users_count > 0) {
    const expectedMaxRetention =
      (stats.users_active_this_month / stats.total_users_count) * 100;
    TestValidator.predicate(
      "user_retention_rate_30_days should not exceed calculated maximum",
      stats.user_retention_rate_30_days <= expectedMaxRetention + 0.01, // +0.01 for floating point tolerance
    );
  }

  // 14. Average days since user activity should be non-negative
  TestValidator.predicate(
    "average_days_since_user_activity should be non-negative",
    stats.average_days_since_user_activity >= 0,
  );

  // 15. Churn rate should be between 0 and 100
  TestValidator.predicate(
    "user_churn_rate should be between 0 and 100",
    stats.user_churn_rate >= 0 && stats.user_churn_rate <= 100,
  );

  // ===== ADMIN CONSISTENCY VALIDATIONS =====

  // 16. Total admins and deleted admins should be non-negative
  TestValidator.predicate(
    "total_admins_count should be non-negative",
    stats.total_admins_count >= 0,
  );

  TestValidator.predicate(
    "deleted_admins_count should be non-negative",
    stats.deleted_admins_count >= 0,
  );

  // 17. Active admins today should not exceed total admins
  TestValidator.predicate(
    "admins_active_today should not exceed total_admins_count",
    stats.admins_active_today <= stats.total_admins_count,
  );

  // 18. Active admins this week should not exceed total admins
  TestValidator.predicate(
    "admins_active_this_week should not exceed total_admins_count",
    stats.admins_active_this_week <= stats.total_admins_count,
  );

  // 19. Active admins this month should not exceed total admins
  TestValidator.predicate(
    "admins_active_this_month should not exceed total_admins_count",
    stats.admins_active_this_month <= stats.total_admins_count,
  );

  // 20. Created admins today should not exceed total admins
  TestValidator.predicate(
    "admins_created_today should not exceed total_admins_count",
    stats.admins_created_today <= stats.total_admins_count,
  );

  // 21. Created admins this week should not exceed total admins
  TestValidator.predicate(
    "admins_created_this_week should not exceed total_admins_count",
    stats.admins_created_this_week <= stats.total_admins_count,
  );

  // 22. Created admins this month should not exceed total admins
  TestValidator.predicate(
    "admins_created_this_month should not exceed total_admins_count",
    stats.admins_created_this_month <= stats.total_admins_count,
  );

  // 23. Temporal consistency for admins: created_today <= created_this_week
  TestValidator.predicate(
    "admins_created_today should not exceed admins_created_this_week",
    stats.admins_created_today <= stats.admins_created_this_week,
  );

  // 24. Temporal consistency for admins: created_this_week <= created_this_month
  TestValidator.predicate(
    "admins_created_this_week should not exceed admins_created_this_month",
    stats.admins_created_this_week <= stats.admins_created_this_month,
  );

  // 25. Temporal consistency for admins: active_today <= active_this_week
  TestValidator.predicate(
    "admins_active_today should not exceed admins_active_this_week",
    stats.admins_active_today <= stats.admins_active_this_week,
  );

  // 26. Temporal consistency for admins: active_this_week <= active_this_month
  TestValidator.predicate(
    "admins_active_this_week should not exceed admins_active_this_month",
    stats.admins_active_this_week <= stats.admins_active_this_month,
  );

  // 27. Admin retention rate should be between 0 and 100
  TestValidator.predicate(
    "admin_retention_rate_30_days should be between 0 and 100",
    stats.admin_retention_rate_30_days >= 0 &&
      stats.admin_retention_rate_30_days <= 100,
  );

  // 28. Average days since admin activity should be non-negative
  TestValidator.predicate(
    "average_days_since_admin_activity should be non-negative",
    stats.average_days_since_admin_activity >= 0,
  );

  // ===== TEMPORAL PERIOD CONSISTENCY =====

  // 29. Data period should be properly ordered
  TestValidator.predicate(
    "data_period_start should be before or equal to data_period_end",
    new Date(stats.data_period_start) <= new Date(stats.data_period_end),
  );

  // 30. Statistics computed timestamp should be valid
  const computedDate = new Date(stats.statistics_computed_at);
  TestValidator.predicate(
    "statistics_computed_at should be a valid timestamp",
    !isNaN(computedDate.getTime()),
  );

  // 31. Account creation acceleration ratio should be non-negative
  TestValidator.predicate(
    "account_creation_acceleration_ratio should be non-negative",
    stats.account_creation_acceleration_ratio >= 0,
  );
}
