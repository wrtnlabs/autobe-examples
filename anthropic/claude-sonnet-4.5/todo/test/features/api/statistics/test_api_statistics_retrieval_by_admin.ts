import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListSystemStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemStatistics";

/**
 * Test that administrators can retrieve comprehensive system-wide statistics
 * for monitoring and oversight purposes.
 *
 * This scenario validates the complete admin workflow including admin
 * registration, authentication, and statistics access. The admin creates an
 * account, logs in (automatically via join operation), and successfully
 * retrieves system statistics including user counts, todo metrics, and activity
 * data.
 *
 * The test verifies that the statistics endpoint returns aggregate metrics
 * without exposing individual user data, ensuring proper data privacy while
 * providing valuable system insights. The response includes total registered
 * users, active user counts, total todo items across all users, completion
 * rates, and other system-wide metrics that help administrators monitor system
 * growth, user engagement patterns, and overall application health.
 *
 * Process:
 *
 * 1. Create a new administrator account with valid credentials
 * 2. Verify admin authentication was successful (tokens issued)
 * 3. Retrieve system-wide statistics using admin credentials
 * 4. Validate business logic and mathematical consistency of metrics
 */
export async function test_api_statistics_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account with registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const currentUrl = typia.random<string & tags.Format<"uri">>();
  const referrerUrl = typia.random<string & tags.Format<"uri">>();

  const adminRegistration = {
    email: adminEmail,
    password: adminPassword,
    href: currentUrl,
    referrer: referrerUrl,
  } satisfies ITodoListAdmin.ICreate;

  // Register admin and receive authentication tokens automatically
  const authorizedAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminRegistration,
    });

  // Step 2: Validate admin registration and authentication
  typia.assert(authorizedAdmin);

  TestValidator.equals(
    "registered email matches input",
    authorizedAdmin.email,
    adminEmail,
  );

  TestValidator.predicate(
    "admin account should be active",
    authorizedAdmin.deleted_at === null ||
      authorizedAdmin.deleted_at === undefined,
  );

  // Step 3: Retrieve system-wide statistics with admin authentication
  const statistics: ITodoListSystemStatistics =
    await api.functional.todoList.admin.admins.statistics.index(connection);

  // Step 4: Validate statistics response structure and types
  typia.assert(statistics);

  // Step 5: Verify business logic and mathematical consistency
  TestValidator.predicate(
    "active_users should not exceed total_users",
    statistics.active_users <= statistics.total_users,
  );

  TestValidator.predicate(
    "active and completed todos should sum to total",
    statistics.active_todos + statistics.completed_todos ===
      statistics.total_todos,
  );

  // Verify calculated metrics are mathematically consistent
  if (statistics.total_todos > 0) {
    const expectedCompletionRate =
      (statistics.completed_todos / statistics.total_todos) * 100;

    TestValidator.predicate(
      "completion_rate calculation should be accurate",
      Math.abs(statistics.completion_rate - expectedCompletionRate) < 0.01,
    );
  }

  if (statistics.total_users > 0) {
    const expectedAverage = statistics.total_todos / statistics.total_users;

    TestValidator.predicate(
      "average_todos_per_user calculation should be accurate",
      Math.abs(statistics.average_todos_per_user - expectedAverage) < 0.01,
    );
  }
}
