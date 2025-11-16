import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRegistrationTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/IRegistrationTrendDay";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUserStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserStatistics";

/**
 * Test that the user statistics endpoint provides accurate user count metrics
 * across different time periods.
 *
 * This test validates admin access to the statistics endpoint and verifies the
 * correctness of user engagement metrics. It ensures that:
 *
 * - Admin authentication is properly established
 * - Statistics endpoint returns complete user count data
 * - Metrics follow logical relationships (daily activity <= 7d activity <= 30d
 *   activity)
 * - Registration trends are properly tracked
 * - Engagement metrics are computed correctly
 */
export async function test_api_user_statistics_user_count_metrics(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to access statistics endpoint
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminAuth: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(adminAuth);
  TestValidator.predicate(
    "admin authentication successful",
    adminAuth.id !== undefined,
  );
  TestValidator.predicate(
    "admin has valid token",
    adminAuth.token.access !== undefined,
  );

  // Step 2: Retrieve user statistics
  const statistics: ITodoAppUserStatistics =
    await api.functional.todoApp.admin.statistics.users.at(connection);
  typia.assert(statistics);

  // Step 3: Validate total user count is non-negative
  TestValidator.predicate(
    "total users count is non-negative",
    statistics.total_users >= 0,
  );

  // Step 4: Validate active user counts are non-negative
  TestValidator.predicate(
    "7-day active users is non-negative",
    statistics.active_users_7d >= 0,
  );
  TestValidator.predicate(
    "30-day active users is non-negative",
    statistics.active_users_30d >= 0,
  );
  TestValidator.predicate(
    "today active users is non-negative",
    statistics.active_users_today >= 0,
  );
  TestValidator.predicate(
    "this week active users is non-negative",
    statistics.active_users_this_week >= 0,
  );
  TestValidator.predicate(
    "this month active users is non-negative",
    statistics.active_users_this_month >= 0,
  );

  // Step 5: Validate logical relationships between active user counts
  TestValidator.predicate(
    "daily active users <= 7-day active users",
    statistics.active_users_today <= statistics.active_users_7d,
  );
  TestValidator.predicate(
    "7-day active users <= 30-day active users",
    statistics.active_users_7d <= statistics.active_users_30d,
  );
  TestValidator.predicate(
    "30-day active users <= total users",
    statistics.active_users_30d <= statistics.total_users,
  );

  // Step 6: Validate new user registration metrics
  TestValidator.predicate(
    "24-hour new users is non-negative",
    statistics.new_users_24h >= 0,
  );
  TestValidator.predicate(
    "7-day new users is non-negative",
    statistics.new_users_7d >= 0,
  );
  TestValidator.predicate(
    "30-day new users is non-negative",
    statistics.new_users_30d >= 0,
  );

  // Step 7: Validate logical relationships for new user registrations
  TestValidator.predicate(
    "24-hour new users <= 7-day new users",
    statistics.new_users_24h <= statistics.new_users_7d,
  );
  TestValidator.predicate(
    "7-day new users <= 30-day new users",
    statistics.new_users_7d <= statistics.new_users_30d,
  );

  // Step 8: Validate registration trend data
  TestValidator.predicate(
    "registration trend is array",
    Array.isArray(statistics.registration_trend),
  );
  TestValidator.predicate(
    "registration trend has entries",
    statistics.registration_trend.length > 0,
  );

  // Validate each registration trend entry
  for (const trendDay of statistics.registration_trend) {
    typia.assert<IRegistrationTrendDay>(trendDay);
    TestValidator.predicate(
      `registration trend date format valid for ${trendDay.date}`,
      /^\d{4}-\d{2}-\d{2}$/.test(trendDay.date),
    );
    TestValidator.predicate(
      `registration count non-negative for ${trendDay.date}`,
      trendDay.count >= 0,
    );
  }

  // Step 9: Validate session duration metric
  TestValidator.predicate(
    "average session duration is non-negative",
    statistics.average_session_duration_minutes >= 0,
  );

  // Step 10: Validate retention percentage
  TestValidator.predicate(
    "user retention week percent is valid range",
    statistics.user_retention_week_percent >= 0 &&
      statistics.user_retention_week_percent <= 100,
  );

  // Step 11: Validate todo metrics
  TestValidator.predicate(
    "average todos per user is non-negative",
    statistics.avg_todos_per_active_user >= 0,
  );
  TestValidator.predicate(
    "average todos completed per user is non-negative",
    statistics.avg_todos_completed_per_active_user >= 0,
  );
  TestValidator.predicate(
    "completed todos <= total todos",
    statistics.avg_todos_completed_per_active_user <=
      statistics.avg_todos_per_active_user,
  );

  // Step 12: Validate peak usage hour
  TestValidator.predicate(
    "peak usage hour is valid",
    parseInt(statistics.peak_usage_hour) >= 0 &&
      parseInt(statistics.peak_usage_hour) <= 23,
  );

  // Step 13: Validate peak usage day
  const validDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  TestValidator.predicate(
    "peak usage day is valid",
    validDays.includes(statistics.peak_usage_day),
  );

  // Step 14: Validate deleted users metric
  TestValidator.predicate(
    "deleted users 30d is non-negative",
    statistics.users_deleted_30d >= 0,
  );

  // Step 15: Validate concurrent users peak
  TestValidator.predicate(
    "concurrent users peak is non-negative",
    statistics.concurrent_users_peak >= 0,
  );
  TestValidator.predicate(
    "concurrent users peak <= total users",
    statistics.concurrent_users_peak <= statistics.total_users,
  );
}
