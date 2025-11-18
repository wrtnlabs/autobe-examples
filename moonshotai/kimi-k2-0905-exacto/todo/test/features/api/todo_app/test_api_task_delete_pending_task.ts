import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test deleting a pending task that is no longer needed.
 *
 * This test validates the complete workflow of task deletion in the todo
 * application. It creates a user account for authentication, establishes a new
 * pending task, and then permanently deletes the task from the database. The
 * test verifies that the deletion operation completes successfully and that the
 * task is completely removed from user-facing interfaces.
 *
 * The testing process follows these steps:
 *
 * 1. Create a new user account to establish authentication context
 * 2. Create a pending task that can be deleted
 * 3. Permanently delete the task using the delete endpoint
 * 4. Validate that the deletion operation completed successfully
 *
 * This test is essential for ensuring that users can clean up their task lists
 * when tasks become obsolete or are created in error, maintaining clean and
 * organized todo management workflows.
 */
export async function test_api_task_delete_pending_task(
  connection: api.IConnection,
) {
  // Create a new user account for authentication
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

  // Create a pending task that will be deleted
  const taskTitle = RandomGenerator.paragraph({ sentences: 3 });
  const task = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: taskTitle,
      description: RandomGenerator.paragraph({ sentences: 5 }),
      status: "pending",
      priority: RandomGenerator.pick([
        "none",
        "low",
        "medium",
        "high",
      ] as const),
      due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task);

  // Validate task was created successfully
  TestValidator.equals("task title matches", task.title, taskTitle);
  TestValidator.equals("task status is pending", task.status, "pending");
  TestValidator.predicate(
    "task has user reference",
    task.user !== null && task.user !== undefined,
  );

  // Delete the task permanently
  const deletedTask = await api.functional.todoApp.user.tasks.erase(
    connection,
    {
      taskId: task.id,
    },
  );
  typia.assert(deletedTask);

  // Validate that the deleted task matches the original task
  TestValidator.equals("deleted task ID matches", deletedTask.id, task.id);
  TestValidator.equals(
    "deleted task title matches",
    deletedTask.title,
    task.title,
  );
  TestValidator.equals(
    "deleted task description matches",
    deletedTask.description,
    task.description,
  );
  TestValidator.equals(
    "deleted task status matches",
    deletedTask.status,
    task.status,
  );
  TestValidator.equals(
    "deleted task priority matches",
    deletedTask.priority,
    task.priority,
  );
  TestValidator.equals(
    "deleted task due date matches",
    deletedTask.due_date,
    task.due_date,
  );
  TestValidator.equals(
    "deleted task user matches",
    deletedTask.user.id,
    task.user.id,
  );
}
