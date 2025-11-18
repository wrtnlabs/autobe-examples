import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskCompletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskCompletion";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful bulk completion of multiple tasks by an authenticated user.
 *
 * This test validates the complete bulk task completion workflow for an
 * authenticated user. The test follows these steps:
 *
 * 1. User registration to establish authentication context
 * 2. Creation of multiple individual tasks (minimum 3 for meaningful testing)
 * 3. Bulk completion operation to mark all tasks as completed simultaneously
 * 4. Validation of response statistics and completion confirmation
 *
 * The bulk completion operation should:
 *
 * - Successfully mark all provided task IDs as completed
 * - Create completion records for each task
 * - Return accurate statistics including successful completion count
 * - Provide meaningful completion percentage and processing time
 * - Handle the operation atomically (all or nothing)
 */
export async function test_api_task_bulk_complete_multiple_tasks_success(
  connection: api.IConnection,
) {
  // Step 1: User registration to establish authentication
  const email = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: "TestPassword123",
      ip: "127.0.0.1",
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create multiple tasks for bulk completion testing
  const taskCreationPromises = ArrayUtil.repeat(5, async (index) => {
    const taskData = {
      title: `Task ${index + 1}: ${RandomGenerator.paragraph({ sentences: 3 })}`,
      description: RandomGenerator.paragraph({ sentences: 5 }),
      priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
      due_date: new Date(Date.now() + (index + 1) * 86400000).toISOString(), // Future dates
      completion_order: index + 1,
    } satisfies ITodoAppTask.ICreate;

    return await api.functional.todoApp.user.tasks.create(connection, {
      body: taskData,
    });
  });

  const createdTasks = await Promise.all(taskCreationPromises);
  createdTasks.forEach((task) => typia.assert(task));

  // Step 3: Prepare bulk completion request with all task IDs
  const taskIdsForBulkCompletion = createdTasks.map((task) => task.id);

  // Step 4: Execute bulk completion operation
  const bulkCompletionResponse =
    await api.functional.todoApp.user.tasks.bulk_complete.bulkComplete(
      connection,
      {
        body: {
          task_ids: taskIdsForBulkCompletion,
        } satisfies ITodoAppTaskCompletion.ICreate,
      },
    );

  typia.assert(bulkCompletionResponse);

  // Step 5: Validate bulk completion results
  TestValidator.equals(
    "all tasks should be successfully completed",
    bulkCompletionResponse.successfully_completed,
    createdTasks.length,
  );

  TestValidator.equals(
    "no tasks should fail during bulk completion",
    bulkCompletionResponse.failed_count,
    0,
  );

  TestValidator.equals(
    "no tasks should be skipped during bulk completion",
    bulkCompletionResponse.skipped_count,
    0,
  );

  TestValidator.equals(
    "completion percentage should be 100%",
    bulkCompletionResponse.completion_percentage,
    100,
  );

  TestValidator.equals(
    "total requested count should match created tasks count",
    bulkCompletionResponse.total_requested,
    createdTasks.length,
  );

  TestValidator.predicate(
    "completed task IDs contain all originally created task IDs",
    bulkCompletionResponse.completed_task_ids.length ===
      taskIdsForBulkCompletion.length &&
      bulkCompletionResponse.completed_task_ids.every((id) =>
        taskIdsForBulkCompletion.includes(id),
      ),
  );

  TestValidator.predicate(
    "failed task IDs array should be empty",
    bulkCompletionResponse.failed_task_ids.length === 0,
  );

  TestValidator.predicate(
    "processing time should be reasonable (less than 5 seconds)",
    bulkCompletionResponse.processing_time_ms < 5000,
  );

  TestValidator.predicate(
    "response should include meaningful completion message",
    bulkCompletionResponse.message.length > 0,
  );

  TestValidator.predicate(
    "timestamp should be recent (within last minute)",
    new Date().getTime() -
      new Date(bulkCompletionResponse.timestamp).getTime() <
      60000,
  );
}
