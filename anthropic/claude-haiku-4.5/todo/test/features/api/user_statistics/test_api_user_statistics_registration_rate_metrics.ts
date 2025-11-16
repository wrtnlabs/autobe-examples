import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRegistrationTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/IRegistrationTrendDay";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUserStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserStatistics";

/**
 * Validates user statistics registration rate metrics endpoint.
 *
 * This test authenticates as an administrator and retrieves comprehensive user
 * statistics including registration metrics across different time periods (24
 * hours, 7 days, 30 days). It verifies that the statistics accurately reflect
 * user acquisition trends and that registration rate metrics maintain logical
 * relationships where registrations in shorter periods are always less than or
 * equal to longer periods.
 *
 * The test validates:
 *
 * 1. Admin authentication succeeds and returns proper credentials
 * 2. Statistics endpoint returns valid ITodoAppUserStatistics object
 * 3. Registration metrics (new_users_24h, new_users_7d, new_users_30d) are all
 *    non-negative integers
 * 4. Registration rate metrics follow logical relationships: new_users_24h <=
 *    new_users_7d <= new_users_30d
 * 5. Registration trend data contains daily breakdowns for the 30-day period
 * 6. All statistics metrics are properly typed and validated
 *
 * This validates the capacity planning utility of the statistics endpoint by
 * confirming acquisition velocity metrics are accurately computed and
 * consistently reported.
 */
export async function test_api_user_statistics_registration_rate_metrics(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin user to access statistics endpoint
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    } satisfies ITodoAppAdmin.ICreate,
  });
  typia.assert(admin);
  TestValidator.equals(
    "admin authenticated successfully",
    typeof admin.id,
    "string",
  );

  // Step 2: Retrieve user statistics from the endpoint
  const statistics =
    await api.functional.todoApp.admin.statistics.users.at(connection);
  typia.assert(statistics);

  // Step 3: Validate registration metrics are non-negative integers
  TestValidator.predicate(
    "new_users_24h is non-negative",
    statistics.new_users_24h >= 0,
  );
  TestValidator.predicate(
    "new_users_7d is non-negative",
    statistics.new_users_7d >= 0,
  );
  TestValidator.predicate(
    "new_users_30d is non-negative",
    statistics.new_users_30d >= 0,
  );

  // Step 4: Validate logical relationships between registration rate metrics
  // Registration in 24h must be <= registrations in 7d
  TestValidator.predicate(
    "new_users_24h <= new_users_7d",
    statistics.new_users_24h <= statistics.new_users_7d,
  );

  // Registration in 7d must be <= registrations in 30d
  TestValidator.predicate(
    "new_users_7d <= new_users_30d",
    statistics.new_users_7d <= statistics.new_users_30d,
  );

  // Combined transitivity: 24h <= 7d <= 30d
  TestValidator.predicate(
    "registration rate metrics maintain logical ordering (24h <= 7d <= 30d)",
    statistics.new_users_24h <= statistics.new_users_7d &&
      statistics.new_users_7d <= statistics.new_users_30d,
  );

  // Step 5: Validate registration trend data structure
  TestValidator.predicate(
    "registration_trend is array",
    Array.isArray(statistics.registration_trend),
  );

  TestValidator.predicate(
    "registration_trend contains data entries",
    statistics.registration_trend.length > 0,
  );

  // Validate each registration trend day entry
  statistics.registration_trend.forEach((day: IRegistrationTrendDay) => {
    typia.assert(day);
    TestValidator.predicate(
      `registration_trend entry ${day.date} has non-negative count`,
      day.count >= 0,
    );
  });

  // Step 6: Validate other user metrics are consistent
  TestValidator.predicate(
    "total_users >= active_users_7d",
    statistics.total_users >= statistics.active_users_7d,
  );

  TestValidator.predicate(
    "active_users_7d >= active_users_today",
    statistics.active_users_7d >= statistics.active_users_today,
  );

  TestValidator.predicate(
    "total_users >= new_users_30d",
    statistics.total_users >= statistics.new_users_30d,
  );

  // Step 7: Validate engagement metrics are reasonable
  TestValidator.predicate(
    "average_session_duration_minutes is non-negative",
    statistics.average_session_duration_minutes >= 0,
  );

  TestValidator.predicate(
    "user_retention_week_percent is between 0 and 100",
    statistics.user_retention_week_percent >= 0 &&
      statistics.user_retention_week_percent <= 100,
  );

  TestValidator.predicate(
    "concurrent_users_peak >= 0",
    statistics.concurrent_users_peak >= 0,
  );
}
