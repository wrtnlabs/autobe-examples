import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskCountStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskCountStatistics";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test dashboard user progress for users with high but not perfect completion
 * rates.
 *
 * This test creates a scenario where a user has mostly completed tasks (8 out
 * of 10) to verify accurate percentage calculation in the dashboard. The test
 * validates mathematical precision in percentage calculations for realistic
 * user productivity metrics.
 *
 * Steps:
 *
 * 1. Create a new user account for testing
 * 2. Create 10 tasks (all initial pending state)
 * 3. Complete 8 of the tasks by updating their status
 * 4. Verify dashboard shows 80% completion rate with correct counts
 * 5. Validate the mathematical precision of the percentage calculation
 */
export async function test_api_dashboard_user_progress_high_completion_rate(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const email = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: "password123",
      href: "https://example.com/todo",
      referrer: "https://example.com/",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create 10 tasks (all in pending state initially)
  const tasks = await ArrayUtil.asyncRepeat(10, async (index) => {
    const task = await api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: `Task ${index + 1}`,
        status: "pending",
      } satisfies ITodoAppTask.ICreate,
    });
    typia.assert(task);
    return task;
  });

  // Step 3: Verify initial dashboard state shows 0% completion
  const initialStats =
    await api.functional.todoApp.user.dashboard.user_progress.userProgress(
      connection,
    );
  typia.assert(initialStats);

  TestValidator.equals(
    "initial total tasks count",
    initialStats.total_tasks,
    10,
  );
  TestValidator.equals(
    "initial completed tasks count",
    initialStats.completed_tasks,
    0,
  );
  TestValidator.equals(
    "initial pending tasks count",
    initialStats.pending_tasks,
    10,
  );
  TestValidator.equals(
    "initial completion rate",
    initialStats.completion_rate,
    0,
  );

  // Step 4: Complete 8 tasks to achieve high completion rate
  const tasksToComplete = tasks.slice(0, 8);
  await ArrayUtil.asyncForEach(tasksToComplete, async (task) => {
    const updatedTask = await api.functional.todoApp.user.tasks.update(
      connection,
      {
        taskId: task.id,
        body: {
          status: "completed",
        } satisfies ITodoAppTask.IUpdate,
      },
    );
    typia.assert(updatedTask);
  });

  // Step 5: Get final dashboard statistics
  const finalStats =
    await api.functional.todoApp.user.dashboard.user_progress.userProgress(
      connection,
    );
  typia.assert(finalStats);

  // Step 6: Validate the high but not perfect completion rate
  TestValidator.equals("final total tasks count", finalStats.total_tasks, 10);
  TestValidator.equals(
    "final completed tasks count",
    finalStats.completed_tasks,
    8,
  );
  TestValidator.equals(
    "final pending tasks count",
    finalStats.pending_tasks,
    2,
  );
  TestValidator.equals("final completion rate", finalStats.completion_rate, 80); // 8/10 = 80%

  // Step 7: Validate mathematical precision of percentage calculation
  const expectedRate = Math.round(
    (finalStats.completed_tasks / finalStats.total_tasks) * 100,
  );
  TestValidator.equals(
    "mathematical accuracy of completion rate",
    finalStats.completion_rate,
    expectedRate,
  );

  // Step 8: Ensure the completion rate is within valid bounds (0-100)
  TestValidator.predicate(
    "completion rate is between 0 and 100",
    finalStats.completion_rate >= 0 && finalStats.completion_rate <= 100,
  );

  // Step 9: Verify task counts add up correctly
  TestValidator.equals(
    "task counts sum correctly",
    finalStats.completed_tasks + finalStats.pending_tasks,
    finalStats.total_tasks,
  );

  // Step 10: Validate this represents a high but not perfect completion rate
  TestValidator.predicate(
    "completion rate is high (>70%)",
    finalStats.completion_rate > 70,
  );
  TestValidator.predicate(
    "completion rate is not perfect (<100%)",
    finalStats.completion_rate < 100,
  );
}
