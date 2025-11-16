import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRegistrationTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/IRegistrationTrendDay";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUserStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserStatistics";

/**
 * Test that an authenticated admin can successfully retrieve comprehensive user
 * statistics.
 *
 * This test validates the admin's ability to access the user statistics
 * endpoint and receive all required system-wide metrics including:
 *
 * - User volume metrics (total users, active users in various time periods)
 * - Registration trends (new users per time period and daily trend breakdown)
 * - Engagement metrics (session duration, retention rates, productivity metrics)
 * - Usage patterns (peak hours and days)
 * - Churn metrics (deleted users)
 * - Concurrent usage metrics
 *
 * Steps:
 *
 * 1. Create an admin account to obtain authentication credentials
 * 2. Call the user statistics endpoint with admin authentication
 * 3. Validate that all required metrics are present in the response
 * 4. Verify that all metrics have appropriate data types and non-negative values
 */
export async function test_api_user_statistics_successful_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ITodoAppAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Retrieve user statistics with admin authentication
  const statistics =
    await api.functional.todoApp.admin.statistics.users.at(connection);
  typia.assert(statistics);

  // Step 3: Validate all required metrics are present
  TestValidator.predicate(
    "total_users metric is present and non-negative",
    statistics.total_users >= 0,
  );

  TestValidator.predicate(
    "active_users_7d metric is present and non-negative",
    statistics.active_users_7d >= 0,
  );

  TestValidator.predicate(
    "active_users_30d metric is present and non-negative",
    statistics.active_users_30d >= 0,
  );

  TestValidator.predicate(
    "active_users_today metric is present and non-negative",
    statistics.active_users_today >= 0,
  );

  TestValidator.predicate(
    "active_users_this_week metric is present and non-negative",
    statistics.active_users_this_week >= 0,
  );

  TestValidator.predicate(
    "active_users_this_month metric is present and non-negative",
    statistics.active_users_this_month >= 0,
  );

  TestValidator.predicate(
    "new_users_24h metric is present and non-negative",
    statistics.new_users_24h >= 0,
  );

  TestValidator.predicate(
    "new_users_7d metric is present and non-negative",
    statistics.new_users_7d >= 0,
  );

  TestValidator.predicate(
    "new_users_30d metric is present and non-negative",
    statistics.new_users_30d >= 0,
  );

  TestValidator.predicate(
    "registration_trend is array",
    Array.isArray(statistics.registration_trend),
  );

  TestValidator.predicate(
    "registration_trend contains valid trend data",
    statistics.registration_trend.length >= 0 &&
      statistics.registration_trend.every(
        (trend) =>
          typeof trend.date === "string" &&
          typeof trend.count === "number" &&
          trend.count >= 0,
      ),
  );

  TestValidator.predicate(
    "average_session_duration_minutes is non-negative number",
    typeof statistics.average_session_duration_minutes === "number" &&
      statistics.average_session_duration_minutes >= 0,
  );

  TestValidator.predicate(
    "user_retention_week_percent is percentage value",
    typeof statistics.user_retention_week_percent === "number" &&
      statistics.user_retention_week_percent >= 0 &&
      statistics.user_retention_week_percent <= 100,
  );

  TestValidator.predicate(
    "avg_todos_per_active_user is non-negative number",
    typeof statistics.avg_todos_per_active_user === "number" &&
      statistics.avg_todos_per_active_user >= 0,
  );

  TestValidator.predicate(
    "avg_todos_completed_per_active_user is non-negative number",
    typeof statistics.avg_todos_completed_per_active_user === "number" &&
      statistics.avg_todos_completed_per_active_user >= 0,
  );

  TestValidator.predicate(
    "peak_usage_hour is valid hour string (0-23)",
    typeof statistics.peak_usage_hour === "string" &&
      /^([0-9]|1[0-9]|2[0-3])$/.test(statistics.peak_usage_hour),
  );

  TestValidator.predicate(
    "peak_usage_day is valid day of week",
    typeof statistics.peak_usage_day === "string" &&
      [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ].includes(statistics.peak_usage_day),
  );

  TestValidator.predicate(
    "users_deleted_30d metric is present and non-negative",
    statistics.users_deleted_30d >= 0,
  );

  TestValidator.predicate(
    "concurrent_users_peak metric is present and non-negative",
    statistics.concurrent_users_peak >= 0,
  );

  // Step 4: Verify data consistency across related metrics
  TestValidator.predicate(
    "active users today should not exceed active users this week",
    statistics.active_users_today <= statistics.active_users_this_week,
  );

  TestValidator.predicate(
    "active users this week should not exceed active users 7 days",
    statistics.active_users_this_week <= statistics.active_users_7d,
  );

  TestValidator.predicate(
    "active users 7 days should not exceed active users 30 days",
    statistics.active_users_7d <= statistics.active_users_30d,
  );

  TestValidator.predicate(
    "active users 30 days should not exceed total users",
    statistics.active_users_30d <= statistics.total_users,
  );

  TestValidator.predicate(
    "new users 24 hours should not exceed new users 7 days",
    statistics.new_users_24h <= statistics.new_users_7d,
  );

  TestValidator.predicate(
    "new users 7 days should not exceed new users 30 days",
    statistics.new_users_7d <= statistics.new_users_30d,
  );
}
