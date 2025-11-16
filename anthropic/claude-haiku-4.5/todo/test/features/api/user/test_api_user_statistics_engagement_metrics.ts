import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRegistrationTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/IRegistrationTrendDay";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUserStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserStatistics";

/**
 * Test that the user statistics endpoint provides engagement metrics indicating
 * user involvement and productivity.
 *
 * This test validates that admin users can retrieve comprehensive engagement
 * metrics from the statistics endpoint. The test verifies that all
 * engagement-related metrics are present and within reasonable ranges,
 * providing administrators with meaningful indicators of feature adoption and
 * user productivity.
 *
 * Process:
 *
 * 1. Create an admin account for accessing the statistics endpoint
 * 2. Retrieve user statistics including engagement metrics
 * 3. Validate engagement metrics are present and have realistic values
 * 4. Verify session duration, retention, and productivity metrics
 */
export async function test_api_user_statistics_engagement_metrics(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for accessing statistics
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

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

  // Step 2: Retrieve user statistics with engagement metrics
  const statistics: ITodoAppUserStatistics =
    await api.functional.todoApp.admin.statistics.users.at(connection);
  typia.assert(statistics);

  // Step 3: Validate engagement metrics are present and realistic
  // Verify average session duration is a positive number
  TestValidator.predicate(
    "average session duration should be positive",
    statistics.average_session_duration_minutes >= 0,
  );

  // Verify user retention percentage is within 0-100 range
  TestValidator.predicate(
    "user retention week percent should be between 0 and 100",
    statistics.user_retention_week_percent >= 0 &&
      statistics.user_retention_week_percent <= 100,
  );

  // Verify average todos per active user is non-negative
  TestValidator.predicate(
    "average todos per active user should be non-negative",
    statistics.avg_todos_per_active_user >= 0,
  );

  // Verify average todos completed per active user is non-negative
  TestValidator.predicate(
    "average todos completed per active user should be non-negative",
    statistics.avg_todos_completed_per_active_user >= 0,
  );

  // Step 4: Verify completion rate is realistic (completed <= created)
  TestValidator.predicate(
    "completed todos should not exceed created todos on average",
    statistics.avg_todos_completed_per_active_user <=
      statistics.avg_todos_per_active_user,
  );

  // Verify all other statistics are present and valid
  TestValidator.predicate(
    "total users should be non-negative",
    statistics.total_users >= 0,
  );

  TestValidator.predicate(
    "active users 7d should be non-negative",
    statistics.active_users_7d >= 0,
  );

  TestValidator.predicate(
    "active users 30d should be non-negative",
    statistics.active_users_30d >= 0,
  );

  TestValidator.predicate(
    "active users today should be non-negative",
    statistics.active_users_today >= 0,
  );

  TestValidator.predicate(
    "new users 24h should be non-negative",
    statistics.new_users_24h >= 0,
  );

  TestValidator.predicate(
    "registration trend should be an array",
    Array.isArray(statistics.registration_trend),
  );

  TestValidator.predicate(
    "peak usage hour should be valid format",
    typeof statistics.peak_usage_hour === "string",
  );

  TestValidator.predicate(
    "peak usage day should be valid format",
    typeof statistics.peak_usage_day === "string",
  );

  TestValidator.predicate(
    "concurrent users peak should be non-negative",
    statistics.concurrent_users_peak >= 0,
  );
}
