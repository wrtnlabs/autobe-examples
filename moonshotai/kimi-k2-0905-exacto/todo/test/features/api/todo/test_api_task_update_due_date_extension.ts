import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test extending a task's due date to accommodate schedule changes.
 *
 * This test validates the complete workflow of extending a task's due date
 * through PUT /todoApp/user/tasks/{taskId}. The test follows these steps:
 *
 * 1. Create a new user account with email-based authentication
 * 2. Create a task with an initial due date set to 1 year in the future
 * 3. Extend the due date to 2 years in the future to simulate schedule changes
 * 4. Verify the due date update is successful and timestamp updated
 * 5. Validate that the new due date stays within business constraints (future
 *    date)
 *
 * The test ensures proper datetime handling and validates that due date updates
 * work correctly for time-sensitive task organization in the Todo application.
 */
export async function test_api_task_update_due_date_extension(
  connection: api.IConnection,
) {
  // Step 1: Create user account for due date testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "TestPassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/login",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create task with due date to be extended
  const initialDueDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 year from now
  const task = await api.functional.todoApp.user.tasks.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 5 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      status: "pending",
      priority: RandomGenerator.pick([
        "none",
        "low",
        "medium",
        "high",
      ] as const),
      due_date: initialDueDate,
    } satisfies ITodoAppTask.ICreate,
  });
  typia.assert(task);

  // Verify initial task creation with proper due date
  TestValidator.equals(
    "task created with due date",
    task.due_date,
    initialDueDate,
  );
  TestValidator.equals("task status is pending", task.status, "pending");

  // Step 3: Extend due date to accommodate schedule changes
  const extendedDueDate = new Date(
    Date.now() + 730 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 2 years from now
  const updatedTask = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: task.id,
      body: {
        due_date: extendedDueDate,
        status: "pending", // Keep status same
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(updatedTask);

  // Step 4: Verify due date update is successful
  TestValidator.equals(
    "task updated with extended due date",
    updatedTask.due_date,
    extendedDueDate,
  );
  TestValidator.equals("task id remains same", updatedTask.id, task.id);
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedTask.updated_at,
    task.updated_at,
  );

  // Step 5: Validate business constraints
  TestValidator.predicate(
    "extended due date is in the future",
    new Date(updatedTask.due_date!).getTime() > Date.now(),
  );

  // Verify some task properties remain unchanged after update
  TestValidator.equals("task title unchanged", updatedTask.title, task.title);
  TestValidator.equals(
    "task description unchanged",
    updatedTask.description,
    task.description,
  );
  TestValidator.equals(
    "task priority unchanged",
    updatedTask.priority,
    task.priority,
  );
}
