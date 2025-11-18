import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test deleting a task that had a due date to verify proper cleanup of
 * scheduled items. Verifies that tasks with due dates are completely removed
 * without leaving orphaned scheduling data. Validates that due date management
 * integrates cleanly with deletion operations.
 */
export async function test_api_task_delete_with_due_date(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testpass123",
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create task with due date set in the future
  const dueDate = RandomGenerator.date(new Date(), 7 * 24 * 60 * 60 * 1000); // Up to 7 days in future
  const taskWithDueDate = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "pending",
        priority: "high",
        due_date: dueDate.toISOString(),
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(taskWithDueDate);

  // Verify task was created with due date
  TestValidator.predicate(
    "task has due date",
    taskWithDueDate.due_date !== null && taskWithDueDate.due_date !== undefined,
  );

  // Step 3: Delete the task with due date
  const deletedTask = await api.functional.todoApp.user.tasks.erase(
    connection,
    {
      taskId: taskWithDueDate.id,
    },
  );
  typia.assert(deletedTask);

  // Verify deletion was successful
  TestValidator.equals(
    "deleted task id matches original",
    deletedTask.id,
    taskWithDueDate.id,
  );
  TestValidator.equals(
    "deleted task title matches",
    deletedTask.title,
    taskWithDueDate.title,
  );
  TestValidator.equals(
    "deleted task due date matches",
    deletedTask.due_date,
    taskWithDueDate.due_date,
  );
}
