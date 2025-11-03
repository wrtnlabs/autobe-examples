import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppDashboard";
import type { ITodoAppTodoDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoDashboardSummary";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that the dashboard displays correctly when a user has no todos yet.
 *
 * This test validates the empty state of the dashboard by:
 *
 * 1. Creating a new user account through registration
 * 2. Retrieving the dashboard for the newly created user
 * 3. Verifying all statistics show zero counts since no todos exist
 * 4. Confirming no recently added or completed todos are present
 * 5. Ensuring the API returns proper empty state data structure
 *
 * This ensures the dashboard gracefully handles the empty state and provides
 * the correct initial view for new users.
 */
export async function test_api_dashboard_empty_state(
  connection: api.IConnection,
) {
  // 1. Register a new user with email and password
  const newUserEmail = typia.random<string & tags.Format<"email">>();
  const newUserPassword = RandomGenerator.alphabets(12);

  const registeredUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: newUserEmail,
        password: newUserPassword,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(registeredUser);

  // Verify the registered user has expected properties
  TestValidator.equals(
    "registered user has valid ID",
    typeof registeredUser.id,
    "string",
  );
  TestValidator.equals(
    "registered user email matches input",
    registeredUser.email,
    newUserEmail,
  );
  TestValidator.equals(
    "registered user status is active",
    registeredUser.status,
    "active",
  );

  // 2. Retrieve the dashboard for the newly registered user
  const dashboard: ITodoAppDashboard =
    await api.functional.todoApp.user.dashboard.index(connection);
  typia.assert(dashboard);

  // 3. Verify all statistics show zero counts for empty state
  TestValidator.equals(
    "active todos count is zero",
    dashboard.active_todos_count,
    0,
  );
  TestValidator.equals(
    "completed today count is zero",
    dashboard.completed_today_count,
    0,
  );
  TestValidator.equals(
    "completed this week count is zero",
    dashboard.completed_this_week_count,
    0,
  );
  TestValidator.equals(
    "total todos count is zero",
    dashboard.total_todos_count,
    0,
  );
  TestValidator.equals(
    "overdue todos count is zero",
    dashboard.overdue_todos_count,
    0,
  );
  TestValidator.equals(
    "upcoming todos count is zero",
    dashboard.upcoming_todos_count,
    0,
  );
  TestValidator.equals(
    "high priority todos count is zero",
    dashboard.high_priority_todos_count,
    0,
  );

  // 4. Verify completion rate is zero
  TestValidator.equals(
    "completion rate is zero percent",
    dashboard.completion_rate_percentage,
    0,
  );

  // 5. Verify no recently added todos
  TestValidator.equals(
    "recently added todos is empty array",
    dashboard.recently_added_todos.length,
    0,
  );
  typia.assert(Array.isArray(dashboard.recently_added_todos));

  // 6. Verify no recently completed todos
  TestValidator.equals(
    "recently completed todos is empty array",
    dashboard.recently_completed_todos.length,
    0,
  );
  typia.assert(Array.isArray(dashboard.recently_completed_todos));
}
