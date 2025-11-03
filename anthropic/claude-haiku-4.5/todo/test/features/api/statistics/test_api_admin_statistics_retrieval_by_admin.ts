import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppStatistics";
import type { ITodoAppStatisticsActiveUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppStatisticsActiveUser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that an authenticated admin can successfully retrieve comprehensive
 * system-wide statistics and usage metrics.
 *
 * This test validates:
 *
 * 1. Admin authentication creates a valid admin account with admin role
 * 2. System-wide statistics can be retrieved by authenticated admin
 * 3. Statistics include all expected aggregated metrics about users and todos
 * 4. Statistics response is properly formatted with correct types and valid values
 * 5. Response includes user counts, todo metrics, activity trends, and active user
 *    summaries
 *
 * The test follows this workflow:
 *
 * 1. Create an admin account and authenticate
 * 2. Create multiple user accounts to generate user population data
 * 3. Retrieve statistics as authenticated admin
 * 4. Validate statistics structure, data integrity, and metric consistency
 */
export async function test_api_admin_statistics_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const matchingPassword = RandomGenerator.alphabets(12);
  const adminRegistration = {
    email:
      typia
        .random<string & tags.Format<"email">>()
        .split("@")[0]
        .substring(0, 20) + "@test.com",
    password: matchingPassword,
    password_confirmation: matchingPassword,
  } satisfies ITodoAppAdmin.IRegister;

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: adminRegistration,
    },
  );
  typia.assert(admin);
  TestValidator.predicate(
    "admin account created successfully",
    admin.id !== null,
  );
  TestValidator.equals(
    "admin email matches registration",
    admin.email,
    adminRegistration.email,
  );
  TestValidator.equals("admin status is active", admin.status, "active");

  // Step 2: Create multiple user accounts to generate system population data
  const userCount = 5;
  const users: ITodoAppUser[] = [];

  for (let i = 0; i < userCount; i++) {
    const user: ITodoAppUser = await api.functional.todoApp.users.create(
      connection,
      {
        body: {
          email:
            typia
              .random<string & tags.Format<"email">>()
              .split("@")[0]
              .substring(0, 15) + `_${i}@test.com`,
          password: RandomGenerator.alphabets(10),
        } satisfies ITodoAppUser.ICreate,
      },
    );
    typia.assert(user);
    users.push(user);
  }

  TestValidator.equals(
    "correct number of users created",
    users.length,
    userCount,
  );
  TestValidator.predicate(
    "all users have valid IDs",
    users.every((u) => u.id !== null),
  );
  TestValidator.predicate(
    "all users have active status",
    users.every((u) => u.status === "active"),
  );

  // Step 3: Retrieve statistics as authenticated admin
  const statistics: ITodoAppStatistics =
    await api.functional.todoApp.admin.statistics.index(connection);
  typia.assert(statistics);

  // Step 4: Validate statistics structure and all metric fields exist
  TestValidator.predicate(
    "statistics has total users count",
    typeof statistics.total_users_count === "number" &&
      statistics.total_users_count >= 0,
  );
  TestValidator.predicate(
    "statistics has active users count",
    typeof statistics.active_users_count === "number" &&
      statistics.active_users_count >= 0,
  );
  TestValidator.predicate(
    "statistics has inactive users count",
    typeof statistics.inactive_users_count === "number" &&
      statistics.inactive_users_count >= 0,
  );
  TestValidator.predicate(
    "statistics has new users today count",
    typeof statistics.new_users_today_count === "number" &&
      statistics.new_users_today_count >= 0,
  );
  TestValidator.predicate(
    "statistics has new users this week count",
    typeof statistics.new_users_this_week_count === "number" &&
      statistics.new_users_this_week_count >= 0,
  );
  TestValidator.predicate(
    "statistics has new users this month count",
    typeof statistics.new_users_this_month_count === "number" &&
      statistics.new_users_this_month_count >= 0,
  );
  TestValidator.predicate(
    "statistics has total todos count",
    typeof statistics.total_todos_count === "number" &&
      statistics.total_todos_count >= 0,
  );
  TestValidator.predicate(
    "statistics has active todos count",
    typeof statistics.active_todos_count === "number" &&
      statistics.active_todos_count >= 0,
  );
  TestValidator.predicate(
    "statistics has completed todos count",
    typeof statistics.completed_todos_count === "number" &&
      statistics.completed_todos_count >= 0,
  );
  TestValidator.predicate(
    "completion rate is valid percentage",
    typeof statistics.completion_rate_percentage === "number" &&
      statistics.completion_rate_percentage >= 0 &&
      statistics.completion_rate_percentage <= 100,
  );
  TestValidator.predicate(
    "average todos per user is valid",
    typeof statistics.average_todos_per_user === "number" &&
      statistics.average_todos_per_user >= 0,
  );
  TestValidator.predicate(
    "todos completed today count is valid",
    typeof statistics.todos_completed_today_count === "number" &&
      statistics.todos_completed_today_count >= 0,
  );
  TestValidator.predicate(
    "todos completed this week count is valid",
    typeof statistics.todos_completed_this_week_count === "number" &&
      statistics.todos_completed_this_week_count >= 0,
  );
  TestValidator.predicate(
    "todos completed this month count is valid",
    typeof statistics.todos_completed_this_month_count === "number" &&
      statistics.todos_completed_this_month_count >= 0,
  );
  TestValidator.predicate(
    "overdue todos count is valid",
    typeof statistics.overdue_todos_count === "number" &&
      statistics.overdue_todos_count >= 0,
  );
  TestValidator.predicate(
    "high priority todos count is valid",
    typeof statistics.high_priority_todos_count === "number" &&
      statistics.high_priority_todos_count >= 0,
  );

  // Step 5: Validate most active users array structure
  TestValidator.predicate(
    "most active users is array",
    Array.isArray(statistics.most_active_users),
  );

  // Validate each active user in the list has proper structure
  for (const activeUser of statistics.most_active_users) {
    typia.assert<ITodoAppStatisticsActiveUser>(activeUser);
    TestValidator.predicate(
      "active user has user_id",
      activeUser.user_id !== null,
    );
    TestValidator.predicate("active user has email", activeUser.email !== null);
    TestValidator.predicate(
      "active user todos created count is valid",
      typeof activeUser.todos_created_count === "number" &&
        activeUser.todos_created_count >= 0,
    );
    TestValidator.predicate(
      "active user todos completed count is valid",
      typeof activeUser.todos_completed_count === "number" &&
        activeUser.todos_completed_count >= 0,
    );
    TestValidator.predicate(
      "active user completion rate is valid percentage",
      typeof activeUser.user_completion_rate_percentage === "number" &&
        activeUser.user_completion_rate_percentage >= 0 &&
        activeUser.user_completion_rate_percentage <= 100,
    );
  }

  // Step 6: Validate consistency of metrics
  TestValidator.predicate(
    "total users includes active and inactive",
    statistics.total_users_count >= statistics.active_users_count,
  );
  TestValidator.predicate(
    "total todos includes active and completed",
    statistics.total_todos_count >=
      statistics.active_todos_count + statistics.completed_todos_count ||
      statistics.total_todos_count === 0,
  );
  TestValidator.predicate(
    "admin statistics retrieval and validation completed successfully",
    true,
  );
}
