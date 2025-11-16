import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRegistrationTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/IRegistrationTrendDay";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUserStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserStatistics";

/**
 * Test that the user statistics endpoint identifies peak usage patterns for
 * activity analysis and capacity planning.
 *
 * This test validates that administrators can retrieve comprehensive statistics
 * about user activity patterns including peak usage hour (0-23) and peak usage
 * day (Monday-Sunday). The test verifies that these metrics correctly identify
 * when the system experiences maximum load and help administrators understand
 * user behavior patterns for infrastructure capacity planning.
 *
 * Test flow:
 *
 * 1. Authenticate as admin by creating an admin account
 * 2. Retrieve user statistics from the statistics endpoint
 * 3. Validate peak_usage_hour is a valid hour string (0-23)
 * 4. Validate peak_usage_day is a valid day of week name
 * 5. Verify statistics support infrastructure capacity planning
 */
export async function test_api_user_statistics_activity_pattern_analysis(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123";

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);
  TestValidator.equals(
    "admin authenticated successfully",
    admin.email,
    adminEmail,
  );

  // Step 2: Retrieve user statistics
  const statistics: ITodoAppUserStatistics =
    await api.functional.todoApp.admin.statistics.users.at(connection);
  typia.assert(statistics);

  // Step 3: Validate peak_usage_hour is a valid hour (0-23) represented as string
  const peakHour = parseInt(statistics.peak_usage_hour, 10);
  TestValidator.predicate(
    "peak_usage_hour is a valid hour string between 0-23",
    peakHour >= 0 && peakHour <= 23 && !isNaN(peakHour),
  );

  // Step 4: Validate peak_usage_day is one of the valid day names
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
    "peak_usage_day is a valid day of week name",
    validDays.includes(statistics.peak_usage_day),
  );

  // Step 5: Verify peak activity indicators support capacity planning
  // Peak metrics should be positive indicators showing system load
  TestValidator.predicate(
    "concurrent_users_peak indicates system load capacity",
    statistics.concurrent_users_peak >= 0,
  );

  // Verify active user metrics show engagement patterns
  TestValidator.predicate(
    "active_users_today is non-negative",
    statistics.active_users_today >= 0,
  );

  TestValidator.predicate(
    "active_users_7d is non-negative",
    statistics.active_users_7d >= 0,
  );

  // Verify registration trends show growth patterns
  TestValidator.predicate(
    "registration_trend array contains data",
    Array.isArray(statistics.registration_trend) &&
      statistics.registration_trend.length > 0,
  );

  // Verify each registration trend entry has valid structure for analysis
  for (const trend of statistics.registration_trend) {
    typia.assert<IRegistrationTrendDay>(trend);
    TestValidator.predicate(
      `registration trend count is non-negative for ${trend.date}`,
      trend.count >= 0,
    );
  }

  // Step 6: Verify statistics metrics support infrastructure capacity planning
  TestValidator.predicate(
    "average_session_duration_minutes supports capacity analysis",
    statistics.average_session_duration_minutes >= 0,
  );

  TestValidator.predicate(
    "user_retention_week_percent is within valid percentage range",
    statistics.user_retention_week_percent >= 0 &&
      statistics.user_retention_week_percent <= 100,
  );

  TestValidator.predicate(
    "total_users indicates overall system user base for planning",
    statistics.total_users >= 0,
  );

  // Verify the peak usage patterns are consistent with other metrics
  TestValidator.predicate(
    "peak_usage_hour is correctly identified as hour string",
    /^\d+$/.test(statistics.peak_usage_hour),
  );

  TestValidator.predicate(
    "statistics provide actionable peak activity metrics",
    statistics.peak_usage_hour !== null &&
      statistics.peak_usage_hour !== undefined &&
      statistics.peak_usage_day !== null &&
      statistics.peak_usage_day !== undefined,
  );
}
