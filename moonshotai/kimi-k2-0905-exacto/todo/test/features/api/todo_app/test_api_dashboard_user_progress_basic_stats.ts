import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskCountStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskCountStatistics";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test basic dashboard user progress retrieval for an authenticated user with
 * mixed task statuses.
 *
 * This test validates the dashboard user progress endpoint by creating a
 * realistic scenario with mixed task statuses. The workflow involves user
 * registration, task creation with different statuses, and verification of
 * accurate task count statistics. We create pending tasks initially, then
 * transition one to completed status to test the completion rate calculation.
 *
 * 1. Create new user account via join endpoint for authentication
 * 2. Create first pending task to establish baseline data
 * 3. Create second pending task for variety in statistics
 * 4. Update one task to completed status to test completion rate
 * 5. Retrieve dashboard user progress statistics
 * 6. Validate total tasks count matches created tasks
 * 7. Validate completed tasks count (should be 1)
 * 8. Validate pending tasks count (should be 1)
 * 9. Validate completion rate percentage calculation (should be 50%)
 *
 * @param connection - API connection with established authentication
 */
export async function test_api_dashboard_user_progress_basic_stats(
  connection: api.IConnection,
): Promise<void> {
  // Create new user account for authentication
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies ITodoAppUser.ICreate;

  const user = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(user);

  // Create first pending task
  const taskCreateBody1 = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    status: "pending",
    priority: RandomGenerator.pick(["none", "low", "medium", "high"]),
  } satisfies ITodoAppTask.ICreate;

  const task1 = await api.functional.todoApp.user.tasks.create(connection, {
    body: taskCreateBody1,
  });
  typia.assert(task1);

  // Create second pending task
  const taskCreateBody2 = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "pending",
    priority: RandomGenerator.pick(["none", "low", "medium", "high"]),
  } satisfies ITodoAppTask.ICreate;

  const task2 = await api.functional.todoApp.user.tasks.create(connection, {
    body: taskCreateBody2,
  });
  typia.assert(task2);

  // Update second task to completed status
  const taskUpdateBody = {
    status: "completed",
  } satisfies ITodoAppTask.IUpdate;

  await api.functional.todoApp.user.tasks.update(connection, {
    taskId: task2.id,
    body: taskUpdateBody,
  });

  // Retrieve dashboard user progress statistics
  const statistics =
    await api.functional.todoApp.user.dashboard.user_progress.userProgress(
      connection,
    );
  typia.assert(statistics);

  // Validate statistics
  TestValidator.equals("total tasks count", statistics.total_tasks, 2);
  TestValidator.equals("completed tasks count", statistics.completed_tasks, 1);
  TestValidator.equals("pending tasks count", statistics.pending_tasks, 1);
  TestValidator.equals(
    "completion rate percentage",
    statistics.completion_rate,
    50,
  );
}
