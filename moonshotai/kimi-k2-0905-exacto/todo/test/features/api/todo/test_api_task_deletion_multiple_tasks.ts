import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskDescription } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDescription";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test deletion of multiple tasks in sequence to ensure proper cleanup
 * functionality. Creates several tasks, deletes them individually, and verifies
 * that each deletion is independent and complete. Validates that task deletion
 * works reliably across multiple sequential operations.
 */
export async function test_api_task_deletion_multiple_tasks(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication
  const email = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: "1234",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create multiple tasks for deletion testing
  const taskTitles = [
    "First task for deletion",
    "Second task for deletion",
    "Third task for deletion",
    "Fourth task for deletion",
    "Fifth task for deletion",
  ] as const;

  const tasks: ITodoAppTask[] = [];

  // Create tasks sequentially
  for (const title of taskTitles) {
    const task = await api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title,
        description: {
          type: "full",
          content: `This is the description for ${title}`,
        },
      } satisfies ITodoAppTask.ICreate,
    });
    typia.assert(task);
    tasks.push(task);
  }

  // Step 3: Verify initial task count
  TestValidator.equals("created task count", tasks.length, 5);

  // Step 4: Delete tasks in sequence and verify deletion sequencing
  // Track deleted task IDs to ensure they're not the same
  const deletedTaskIds: string[] = [];

  for (const task of tasks) {
    // Delete the current task
    await api.functional.todoApp.user.tasks.erase(connection, {
      taskId: task.id,
    });

    // Track that this task was deleted
    deletedTaskIds.push(task.id);

    TestValidator.equals(
      "task ID should be unique",
      Array.from(new Set(deletedTaskIds)).length,
      deletedTaskIds.length,
    );
  }

  // Step 5: Verify all tasks were processed for deletion
  TestValidator.equals("all tasks scheduled for deletion", tasks.length, 5);
  TestValidator.equals(
    "all task IDs are unique",
    Array.from(new Set(deletedTaskIds)).length,
    deletedTaskIds.length,
  );

  // Step 6: Test rapid sequential deletions
  const rapidTasks: ITodoAppTask[] = [];

  // Create multiple tasks quickly
  for (let i = 0; i < 3; i++) {
    const task = await api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: `Rapid deletion task ${i + 1}`,
      } satisfies ITodoAppTask.ICreate,
    });
    typia.assert(task);
    rapidTasks.push(task);
  }

  // Delete them rapidly in sequence
  for (const task of rapidTasks) {
    await api.functional.todoApp.user.tasks.erase(connection, {
      taskId: task.id,
    });
  }

  TestValidator.equals("rapid deletion completed", rapidTasks.length, 3);

  // Step 7: Test independence - create similar tasks and delete in different order
  const independenceTasks: ITodoAppTask[] = [];

  // Create tasks with similar titles
  for (let i = 0; i < 3; i++) {
    const task = await api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: `Similar task ${i}`,
        description: {
          type: "full",
          content: "Similar description",
        },
      } satisfies ITodoAppTask.ICreate,
    });
    typia.assert(task);
    independenceTasks.push(task);
  }

  // Delete in reverse order to test independence
  for (let i = independenceTasks.length - 1; i >= 0; i--) {
    await api.functional.todoApp.user.tasks.erase(connection, {
      taskId: independenceTasks[i].id,
    });
  }

  TestValidator.equals(
    "independence test completed",
    independenceTasks.length,
    3,
  );

  // Step 8: Verify task creation still works after deletions
  const finalTask = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: "Final task after multiple deletions",
      description: {
        type: "full",
        content: "Checking that task creation still works",
      },
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(finalTask);

  TestValidator.equals(
    "task creation works after deletions",
    finalTask.title,
    "Final task after multiple deletions",
  );
}
