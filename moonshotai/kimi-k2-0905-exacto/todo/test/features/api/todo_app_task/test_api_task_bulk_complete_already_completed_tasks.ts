import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskCompletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskCompletion";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_task_bulk_complete_already_completed_tasks(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account for task management
  const email = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: "password123",
      href: "https://example.com",
      referrer: "https://google.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create multiple tasks (some will be completed individually)
  const task1 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 1 }),
      priority: "High",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task1);
  TestValidator.equals("task1 should be pending", task1.status, "pending");

  const task2 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 1 }),
      priority: "Medium",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task2);
  TestValidator.equals("task2 should be pending", task2.status, "pending");

  const task3 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 1 }),
      priority: "Low",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task3);
  TestValidator.equals("task3 should be pending", task3.status, "pending");

  // Step 3: Individually complete some tasks (task1 and task3)
  const completedTasks = await Promise.all([
    api.functional.todoApp.user.tasks.bulk_complete.bulkComplete(connection, {
      body: {
        task_ids: [task1.id],
      } satisfies ITodoAppTaskCompletion.ICreate,
    }),
    api.functional.todoApp.user.tasks.bulk_complete.bulkComplete(connection, {
      body: {
        task_ids: [task3.id],
      } satisfies ITodoAppTaskCompletion.ICreate,
    }),
  ]);

  // Validate individual completions
  TestValidator.equals(
    "task1 completion count",
    completedTasks[0].successfully_completed,
    1,
  );
  TestValidator.equals(
    "task3 completion count",
    completedTasks[1].successfully_completed,
    1,
  );
  TestValidator.equals(
    "task1 total requested",
    completedTasks[0].total_requested,
    1,
  );
  TestValidator.equals(
    "task3 total requested",
    completedTasks[1].total_requested,
    1,
  );

  // Step 4: Now perform bulk completion on ALL tasks (mix of completed and pending)
  const bulkResult =
    await api.functional.todoApp.user.tasks.bulk_complete.bulkComplete(
      connection,
      {
        body: {
          task_ids: [task1.id, task2.id, task3.id],
        } satisfies ITodoAppTaskCompletion.ICreate,
      },
    );
  typia.assert(bulkResult);

  // Step 5: Validate mixed-state handling statistics
  TestValidator.equals(
    "bulk completion total requested",
    bulkResult.total_requested,
    3,
  );
  TestValidator.equals(
    "bulk completion successfully completed",
    bulkResult.successfully_completed,
    1,
  );
  TestValidator.equals(
    "bulk completion skipped count",
    bulkResult.skipped_count,
    2,
  );
  TestValidator.equals(
    "bulk completion failed count",
    bulkResult.failed_count,
    0,
  );
  TestValidator.equals(
    "bulk completion percentage",
    bulkResult.completion_percentage,
    33.33333333333333,
  );
  TestValidator.equals(
    "bulk completion completed task IDs count",
    bulkResult.completed_task_ids.length,
    1,
  );
  TestValidator.equals(
    "bulk completion failed task IDs count",
    bulkResult.failed_task_ids.length,
    0,
  );
  TestValidator.equals(
    "bulk completion message includes mixed state",
    bulkResult.message.toLowerCase().includes("complete"),
    true,
  );
  TestValidator.predicate(
    "bulk completion processing time positive",
    bulkResult.processing_time_ms > 0,
  );
  TestValidator.predicate(
    "bulk completion timestamp valid",
    typeof bulkResult.timestamp === "string" && bulkResult.timestamp.length > 0,
  );

  // Verify that only task2 (the previously pending task) was actually completed this time
  TestValidator.predicate(
    "task2 is in completed IDs",
    bulkResult.completed_task_ids.includes(task2.id),
  );
  TestValidator.predicate(
    "task1 is NOT in completed IDs",
    !bulkResult.completed_task_ids.includes(task1.id),
  );
  TestValidator.predicate(
    "task3 is NOT in completed IDs",
    !bulkResult.completed_task_ids.includes(task3.id),
  );

  // Step 6: Validate that task statuses remain correct
  // Since the API doesn't expose individual task retrieval, we validate the completion logic
  // through the bulk operation results which should be sufficient for this test scenario
  TestValidator.predicate(
    "total requested equals all tasks",
    bulkResult.total_requested === 3,
  );
  TestValidator.predicate(
    "successfully completed plus skipped equals total",
    bulkResult.successfully_completed + bulkResult.skipped_count ===
      bulkResult.total_requested,
  );
}
