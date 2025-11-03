import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppDashboard";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoDashboardSummary";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validates strict data isolation in user dashboards.
 *
 * This test ensures that each user sees only their own dashboard statistics,
 * enforcing complete data isolation in multi-user environments. The test:
 *
 * 1. Registers first user and creates multiple todos with various states
 * 2. Retrieves first user's dashboard and validates statistics
 * 3. Registers second user and creates their own set of todos
 * 4. Retrieves second user's dashboard and validates statistics
 * 5. Verifies that each dashboard contains only the user's own todos
 * 6. Confirms no cross-user data leakage exists
 *
 * The dashboard should return different statistics for each user based on their
 * own todos, demonstrating proper data isolation at the application level.
 */
export async function test_api_dashboard_data_isolation(
  connection: api.IConnection,
) {
  // Step 1: Register first user
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Password = RandomGenerator.alphabets(12);
  const user1Auth: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: user1Email,
        password: user1Password,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(user1Auth);

  // Step 2: Create multiple todos for user 1
  const user1Todo1 = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        priority: "high",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(user1Todo1);

  const user1Todo2 = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        priority: "medium",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(user1Todo2);

  const user1Todo3 = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        priority: "low",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(user1Todo3);

  // Step 3: Retrieve and validate user 1's dashboard
  const user1Dashboard: ITodoAppDashboard =
    await api.functional.todoApp.user.dashboard.index(connection);
  typia.assert(user1Dashboard);

  // Verify user 1's dashboard shows their todos
  TestValidator.equals(
    "user 1 has 3 active todos",
    user1Dashboard.active_todos_count,
    3,
  );
  TestValidator.predicate(
    "user 1 dashboard contains recently added todos",
    user1Dashboard.recently_added_todos.length > 0,
  );
  TestValidator.predicate(
    "user 1 high priority todos count is greater than 0",
    user1Dashboard.high_priority_todos_count > 0,
  );

  // Step 4: Register second user
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Password = RandomGenerator.alphabets(12);

  // Create a new connection context for user 2
  const user2Connection: api.IConnection = { ...connection, headers: {} };

  const user2Auth: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(user2Connection, {
      body: {
        email: user2Email,
        password: user2Password,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(user2Auth);

  // Step 5: Create todos for user 2 (different count and properties)
  const user2Todo1 = await api.functional.todoApp.user.todos.create(
    user2Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        priority: "low",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(user2Todo1);

  const user2Todo2 = await api.functional.todoApp.user.todos.create(
    user2Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        priority: "medium",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(user2Todo2);

  // Step 6: Retrieve and validate user 2's dashboard
  const user2Dashboard: ITodoAppDashboard =
    await api.functional.todoApp.user.dashboard.index(user2Connection);
  typia.assert(user2Dashboard);

  // Verify user 2's dashboard shows their todos (should be different from user 1)
  TestValidator.equals(
    "user 2 has 2 active todos",
    user2Dashboard.active_todos_count,
    2,
  );
  TestValidator.notEquals(
    "user 2 dashboard differs from user 1 dashboard",
    user1Dashboard.active_todos_count,
    user2Dashboard.active_todos_count,
  );

  // Step 7: Verify no cross-user data leakage
  TestValidator.predicate(
    "user 1 dashboard high priority todos count is 1",
    user1Dashboard.high_priority_todos_count === 1,
  );
  TestValidator.predicate(
    "user 2 dashboard high priority todos count is 0",
    user2Dashboard.high_priority_todos_count === 0,
  );

  // Step 8: Verify recently added todos are different
  TestValidator.notEquals(
    "user 1 and user 2 have different recently added todos",
    user1Dashboard.recently_added_todos.length,
    user2Dashboard.recently_added_todos.length,
  );

  // Step 9: Re-authenticate as user 1 and verify dashboard is still correct
  const user1ReAuthConnection: api.IConnection = { ...connection, headers: {} };

  const user1ReAuth: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(user1ReAuthConnection, {
      body: {
        email: user1Email,
        password: user1Password,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(user1ReAuth);

  const user1DashboardAfterReauth: ITodoAppDashboard =
    await api.functional.todoApp.user.dashboard.index(user1ReAuthConnection);
  typia.assert(user1DashboardAfterReauth);

  // Verify user 1's dashboard is consistent
  TestValidator.equals(
    "user 1 dashboard remains consistent after re-authentication",
    user1DashboardAfterReauth.active_todos_count,
    user1Dashboard.active_todos_count,
  );
}
