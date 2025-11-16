import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRegistrationTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/IRegistrationTrendDay";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUserStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserStatistics";

/**
 * Validate the user statistics endpoint for tracking account deletion and
 * concurrent user metrics.
 *
 * This test authenticates as an administrator and retrieves comprehensive user
 * statistics, specifically validating metrics for user churn
 * (users_deleted_30d) and infrastructure capacity (concurrent_users_peak).
 * These metrics are essential for administrative monitoring of user attrition
 * rates and infrastructure capacity planning.
 *
 * The test workflow:
 *
 * 1. Create an admin account for authentication and authorization
 * 2. Retrieve user statistics from the admin endpoint
 * 3. Validate that users_deleted_30d metric shows account deletions in last 30
 *    days
 * 4. Validate that concurrent_users_peak metric shows maximum simultaneous active
 *    users
 * 5. Verify metrics support capacity management and churn analysis
 * 6. Ensure metrics reflect realistic system state
 */
export async function test_api_user_statistics_churn_and_capacity_metrics(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

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

  // Step 2: Retrieve user statistics
  const statistics: ITodoAppUserStatistics =
    await api.functional.todoApp.admin.statistics.users.at(connection);
  typia.assert(statistics);

  // Step 3: Validate users_deleted_30d metric (churn tracking)
  // users_deleted_30d should be non-negative and represent account deletions in last 30 days
  TestValidator.predicate(
    "users_deleted_30d should be non-negative for churn measurement",
    statistics.users_deleted_30d >= 0,
  );

  // Step 4: Validate concurrent_users_peak metric (capacity planning)
  // concurrent_users_peak represents maximum simultaneous active users for infrastructure planning
  TestValidator.predicate(
    "concurrent_users_peak should be non-negative for capacity planning",
    statistics.concurrent_users_peak >= 0,
  );

  // Step 5: Verify relationship between concurrent_users_peak and total_users
  // Peak concurrent users cannot exceed total registered users
  TestValidator.predicate(
    "concurrent_users_peak should not exceed total_users",
    statistics.concurrent_users_peak <= statistics.total_users,
  );

  // Step 6: Validate that users_deleted_30d does not exceed total_users
  // Churn metric cannot exceed total user base
  TestValidator.predicate(
    "users_deleted_30d should not exceed total_users",
    statistics.users_deleted_30d <= statistics.total_users,
  );

  // Step 7: Verify active user metrics for comprehensive validation
  // Active users in last 30 days should be non-negative
  TestValidator.predicate(
    "active_users_30d should be non-negative for engagement measurement",
    statistics.active_users_30d >= 0,
  );

  // Active users 30d should not exceed total users
  TestValidator.predicate(
    "active_users_30d should not exceed total_users",
    statistics.active_users_30d <= statistics.total_users,
  );

  // Step 8: Validate peak usage metrics for infrastructure planning
  // Peak usage hour should be valid 24-hour format (0-23)
  TestValidator.predicate(
    "peak_usage_hour should be valid 24-hour format for capacity planning",
    /^([0-9]|[0-1][0-9]|2[0-3])$/.test(statistics.peak_usage_hour),
  );

  // Peak usage day should be a valid day of week
  TestValidator.predicate(
    "peak_usage_day should be valid day of week for usage pattern analysis",
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

  // Step 9: Validate registration trend has data for growth analysis
  // registration_trend should contain entries for historical registration tracking
  TestValidator.predicate(
    "registration_trend should have entries for 30-day tracking",
    statistics.registration_trend.length > 0,
  );
}
