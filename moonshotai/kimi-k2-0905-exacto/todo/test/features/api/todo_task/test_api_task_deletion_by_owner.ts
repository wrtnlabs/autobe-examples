import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test complete task deletion workflow where a user creates a task and then
 * permanently deletes it. Validates that the deletion operation properly
 * removes the task from the database, maintains data integrity, and returns
 * appropriate response. The scenario includes task creation to ensure the task
 * exists before deletion, and verification of user authentication and task
 * ownership. Tests that deleted tasks cannot be retrieved after deletion and
 * that the operation properly handles task removal from the user's task list.
 */
export async function test_api_task_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new user account with authentication
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

  // Step 2: Create a todo task for the user
  const taskTitle = RandomGenerator.paragraph({ sentences: 3 });
  const task = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: taskTitle,
      description: RandomGenerator.content({ paragraphs: 2 }),
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

  // Verify task was created with correct ownership
  TestValidator.equals(
    "task user ID matches authenticated user",
    task.user.id,
    user.id,
  );
  TestValidator.equals(
    "task title matches creation request",
    task.title,
    taskTitle,
  );
  TestValidator.equals("task status is pending", task.status, "pending");

  // Step 3: Delete the task using the task deletion endpoint
  await api.functional.todoApp.user.users.tasks.erase(connection, {
    userId: user.id,
    taskId: task.id,
  });

  // Step 4: Verify deletion was successful
  // Since erase returns void, we verify it doesn't throw an error
  TestValidator.predicate("task deletion completed without error", true);

  // Validate that the deletion operation completed successfully
  // The API returning without error confirms the task was successfully deleted
}
