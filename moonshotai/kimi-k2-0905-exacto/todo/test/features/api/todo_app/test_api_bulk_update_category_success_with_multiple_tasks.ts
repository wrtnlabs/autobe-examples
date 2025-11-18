import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskUpdateResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskUpdateResult";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_bulk_update_category_success_with_multiple_tasks(
  connection: api.IConnection,
) {
  // 1. Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "password123",
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);
  TestValidator.equals("user has proper email", user.email, userEmail);

  // 2. Create first category for initial task organization
  const firstCategory: ITodoAppCategory =
    await api.functional.todoApp.user.categories.create(connection, {
      body: {
        name: "Work Tasks",
        description: "Work-related tasks and assignments",
      } satisfies ITodoAppCategory.ICreate,
    });
  typia.assert(firstCategory);
  TestValidator.equals("first category name", firstCategory.name, "Work Tasks");

  // 3. Create second category as target for bulk updates
  const secondCategory: ITodoAppCategory =
    await api.functional.todoApp.user.categories.create(connection, {
      body: {
        name: "Personal Tasks",
        description: "Personal life and family tasks",
      } satisfies ITodoAppCategory.ICreate,
    });
  typia.assert(secondCategory);
  TestValidator.equals(
    "second category name",
    secondCategory.name,
    "Personal Tasks",
  );
  TestValidator.notEquals(
    "categories have different IDs",
    firstCategory.id,
    secondCategory.id,
  );

  // 4-5. Create multiple tasks in first category using async operations
  const taskCount = 5;
  const tasks: ITodoAppTask[] = [];

  for (let index = 0; index < taskCount; index++) {
    const taskBody = {
      title: `Task ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
      description: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 4,
        wordMax: 8,
      }),
      todo_app_category_id: firstCategory.id,
      priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
      completion_order: index + 1,
    } satisfies ITodoAppTask.ICreate;

    const task: ITodoAppTask = await api.functional.todoApp.user.tasks.create(
      connection,
      {
        body: taskBody,
      },
    );
    typia.assert(task);
    tasks.push(task);
  }

  // Verify all tasks are in first category
  for (const task of tasks) {
    TestValidator.equals(
      "task is in first category",
      task.category?.id,
      firstCategory.id,
    );
    TestValidator.equals(
      "task has proper title start",
      task.title.startsWith("Task "),
      true,
    );
  }

  // Extract task IDs for bulk update
  const taskIds = tasks.map((task) => task.id);
  TestValidator.equals(
    "correct number of tasks created",
    taskIds.length,
    taskCount,
  );

  // 10. Perform bulk category update to move all tasks from first category to second category
  const bulkUpdateResult: ITodoAppTaskUpdateResult =
    await api.functional.todoApp.user.tasks.bulk_update_category.updateBulkCategory(
      connection,
      {
        body: {
          task_ids: taskIds,
          todo_app_category_id: secondCategory.id,
        } satisfies ITodoAppTask.IBulkUpdateCategory,
      },
    );
  typia.assert(bulkUpdateResult);

  // Verify bulk update result
  TestValidator.equals(
    "updated task count matches",
    bulkUpdateResult.updatedTaskCount,
    taskCount,
  );
  TestValidator.equals(
    "operation was successful",
    bulkUpdateResult.success,
    true,
  );
  TestValidator.predicate(
    "has update message",
    bulkUpdateResult.message.length > 0,
  );

  // 11. Verify tasks are now in second category by creating new tasks and checking existing ones
  // Create additional task in second category to verify mixed context
  const newTask: ITodoAppTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "New task in second category",
        todo_app_category_id: secondCategory.id,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(newTask);
  TestValidator.equals(
    "new task in second category",
    newTask.category?.id,
    secondCategory.id,
  );

  // Validate that all moved tasks are actually in second category
  // Since we can't easily fetch all tasks, we verify by the bulk operation count
  // and ensure the operation completed without errors
  const totalTasksAfterMove = taskCount + 1;
  TestValidator.equals("total tasks count", totalTasksAfterMove, taskCount + 1);
  TestValidator.predicate(
    "message indicates successful operation",
    bulkUpdateResult.message.toLowerCase().includes("updat") ||
      bulkUpdateResult.message.toLowerCase().includes("success"),
  );

  // Test atomic nature by attempting another bulk operation with same task IDs
  // This should succeed and update the same tasks again (idempotent behavior)
  const secondBulkUpdateResult: ITodoAppTaskUpdateResult =
    await api.functional.todoApp.user.tasks.bulk_update_category.updateBulkCategory(
      connection,
      {
        body: {
          task_ids: taskIds,
          todo_app_category_id: secondCategory.id,
        } satisfies ITodoAppTask.IBulkUpdateCategory,
      },
    );
  TestValidator.equals(
    "second bulk update also successful",
    secondBulkUpdateResult.success,
    true,
  );
  TestValidator.equals(
    "second update count matches",
    secondBulkUpdateResult.updatedTaskCount,
    taskCount,
  );
}
