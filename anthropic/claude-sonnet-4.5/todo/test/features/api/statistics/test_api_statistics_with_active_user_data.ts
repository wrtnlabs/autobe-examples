import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListSystemStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemStatistics";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that system statistics accurately reflect real user and todo data.
 *
 * This test validates the admin statistics endpoint by creating a complete test
 * environment with multiple users and their todo items, then verifying that the
 * statistics API correctly aggregates this data.
 *
 * Test workflow:
 *
 * 1. Create an admin account for accessing statistics
 * 2. Create multiple regular user accounts (3-5 users)
 * 3. Each user creates several todo items with varied statuses
 * 4. Admin retrieves system statistics
 * 5. Validate that all metrics accurately reflect the created test data
 */
export async function test_api_statistics_with_active_user_data(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create multiple users and their todo items
  const userCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<5>
  >();
  const allTodos: ITodoListTodo[] = [];

  for (let i = 0; i < userCount; i++) {
    // Create user account
    const user = await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.IRegister,
    });
    typia.assert(user);

    // Create todos for this user (2-5 todos per user)
    const todosPerUser = typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
    >();

    for (let j = 0; j < todosPerUser; j++) {
      const statuses = ["complete", "incomplete"] as const;
      const status = RandomGenerator.pick(statuses);

      const todo = await api.functional.todoList.user.todos.create(connection, {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 7,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          status: status,
        } satisfies ITodoListTodo.ICreate,
      });
      typia.assert(todo);
      allTodos.push(todo);
    }
  }

  // Step 3: Admin retrieves statistics (already authenticated from join)
  const statistics =
    await api.functional.todoList.admin.admins.statistics.index(connection);
  typia.assert(statistics);

  // Step 4: Validate statistics
  const completedCount = allTodos.filter((t) => t.status === "complete").length;
  const incompleteCount = allTodos.filter(
    (t) => t.status === "incomplete",
  ).length;
  const expectedCompletionRate =
    allTodos.length > 0 ? (completedCount / allTodos.length) * 100 : 0;
  const expectedAvgTodosPerUser = allTodos.length / userCount;

  TestValidator.equals(
    "total users matches",
    statistics.total_users,
    userCount,
  );
  TestValidator.equals(
    "total todos matches",
    statistics.total_todos,
    allTodos.length,
  );
  TestValidator.equals(
    "completed todos matches",
    statistics.completed_todos,
    completedCount,
  );
  TestValidator.equals(
    "active todos matches",
    statistics.active_todos,
    incompleteCount,
  );
  TestValidator.predicate(
    "completion rate is accurate",
    Math.abs(statistics.completion_rate - expectedCompletionRate) < 0.01,
  );
  TestValidator.predicate(
    "average todos per user is accurate",
    Math.abs(statistics.average_todos_per_user - expectedAvgTodosPerUser) <
      0.01,
  );
}
