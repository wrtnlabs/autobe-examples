import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskCountStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskCountStatistics";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test dashboard user progress when all user tasks are pending.
 *
 * This test validates the dashboard statistics calculation when a user has
 * multiple tasks but none are completed. It creates a realistic scenario where
 * a user has several pending tasks and verifies that the progress metrics
 * correctly reflect zero completion.
 *
 * The test follows this workflow:
 *
 * 1. Create a new user account for authentication and task ownership
 * 2. Create multiple pending tasks with different priorities and descriptions
 * 3. Retrieve dashboard statistics to analyze the zero-completion scenario
 * 4. Validate that total_tasks equals pending_tasks (all tasks are pending)
 * 5. Verify completed_tasks is zero and completion_rate is 0%
 * 6. Ensure the calculation correctly handles the edge case of no completed tasks
 */
export async function test_api_dashboard_user_progress_all_pending(
  connection: api.IConnection,
) {
  // Create new user account for testing
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/dashboard",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Create first pending task
  const task1 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 5 }),
      status: "pending",
      priority: "high",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task1);

  // Create second pending task
  const task2 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 4 }),
      status: "pending",
      priority: "medium",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task2);

  // Create third pending task
  const task3 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 4 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      status: "pending",
      priority: "low",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task3);

  // Retrieve dashboard statistics
  const statistics =
    await api.functional.todoApp.user.dashboard.user_progress.userProgress(
      connection,
    );
  typia.assert(statistics);

  // Validate all tasks are pending (total = pending)
  TestValidator.equals(
    "total tasks should equal pending tasks",
    statistics.total_tasks,
    statistics.pending_tasks,
  );

  // Validate completed tasks is zero
  TestValidator.equals(
    "completed tasks should be zero",
    statistics.completed_tasks,
    0,
  );

  // Validate completion rate is 0%
  TestValidator.equals(
    "completion rate should be 0%",
    statistics.completion_rate,
    0,
  );

  // Validate the specific counts
  TestValidator.equals("total tasks should be 3", statistics.total_tasks, 3);
  TestValidator.equals(
    "pending tasks should be 3",
    statistics.pending_tasks,
    3,
  );
}
