import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test bulk archiving of completed tasks to move them out of active view.
 * Create multiple tasks in completed status, then use bulk patch to archive
 * them. Validate that tasks are properly archived and response indicates
 * success. This tests cleanup workflows where users organize completed work.
 */
export async function test_api_bulk_task_archive_by_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new user account for authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "securePassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // 2. Create multiple completed tasks that need to be archived
  const task1 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      status: "completed",
      priority: "medium",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task1);

  const task2 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.content({ paragraphs: 1 }),
      status: "completed",
      priority: "high",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task2);

  const task3 = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 4 }),
      description: RandomGenerator.content({ paragraphs: 3 }),
      status: "completed",
      priority: "low",
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task3);

  // Also create a pending task to ensure it doesn't get archived
  const pendingTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "pending",
        priority: "medium",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(pendingTask);

  // 3. Use bulk patch operation to archive the completed tasks
  const bulkResponse = await api.functional.todoApp.user.tasks.bulk.bulkUpdate(
    connection,
    {
      body: {
        task_ids: [task1.id, task2.id, task3.id],
        action: "archive",
      } satisfies ITodoAppTask.IBulkRequest,
    },
  );
  typia.assert(bulkResponse);

  // 4. Validate that the bulk operation succeeded
  TestValidator.equals(
    "bulk archive success count",
    bulkResponse.success_count,
    3,
  );
  TestValidator.equals(
    "bulk archive failure count",
    bulkResponse.failure_count,
    0,
  );
  TestValidator.equals("bulk archive total count", bulkResponse.total_count, 3);
  TestValidator.equals(
    "bulk archive has errors",
    bulkResponse.has_errors,
    false,
  );
  TestValidator.equals(
    "bulk archive results length",
    bulkResponse.results.length,
    3,
  );

  // Validate individual task results
  for (const result of bulkResponse.results) {
    TestValidator.equals("individual task status", result.status, "success");
    TestValidator.predicate(
      "task has no error message",
      result.error_message === null || result.error_message === undefined,
    );
    TestValidator.equals("operation type", result.operation_type, "archive");
  }

  // 5. Verify the response structure contains expected task data
  const archivedTaskIds = bulkResponse.results.map((result) => result.task_id);
  TestValidator.predicate(
    "all completed tasks archived",
    archivedTaskIds.includes(task1.id) &&
      archivedTaskIds.includes(task2.id) &&
      archivedTaskIds.includes(task3.id),
  );

  // Verify that the pending task was not affected
  TestValidator.predicate(
    "pending task not in archived results",
    !archivedTaskIds.includes(pendingTask.id),
  );
}
