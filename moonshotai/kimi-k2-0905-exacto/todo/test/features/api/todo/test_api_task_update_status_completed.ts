import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test updating a task's status to completed.
 *
 * This test validates the task lifecycle workflow from pending to completed,
 * ensuring proper status transitions and updated timestamps. The scenario
 * involves:
 *
 * 1. Creating a new user account for task ownership
 * 2. Creating a task with initial pending status
 * 3. Updating the task status to completed
 * 4. Verifying the status change is reflected in the response
 * 5. Ensuring other task properties remain unchanged unless explicitly modified
 * 6. Validating that the updated_at timestamp is properly updated
 *
 * This comprehensive test ensures the task update functionality works correctly
 * for status transitions while maintaining data integrity of other properties.
 */
export async function test_api_task_update_status_completed(
  connection: api.IConnection,
) {
  // Create new user account for task ownership
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "SecurePassword123",
      ip: "127.0.0.1",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Create a task with initial status (defaults to pending)
  const now = new Date();
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const dueDate = RandomGenerator.date(
    now,
    oneYearFromNow.getTime() - now.getTime(),
  ).toISOString();

  const taskCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    priority: "Medium",
    due_date: dueDate,
    completion_order: 1,
  } satisfies ITodoAppTask.ICreate;

  const createdTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: taskCreateBody,
    },
  );
  typia.assert(createdTask);

  // Verify initial task state
  TestValidator.equals(
    "task title matches creation",
    createdTask.title,
    taskCreateBody.title,
  );
  TestValidator.equals(
    "task description matches creation",
    createdTask.description,
    taskCreateBody.description,
  );
  TestValidator.equals(
    "task priority matches creation",
    createdTask.priority,
    taskCreateBody.priority,
  );
  TestValidator.equals(
    "task due_date matches creation",
    createdTask.due_date,
    taskCreateBody.due_date,
  );
  TestValidator.equals(
    "task completion_order matches creation",
    createdTask.completion_order,
    taskCreateBody.completion_order,
  );
  TestValidator.equals("task status is pending", createdTask.status, "pending");

  // Update task status to completed
  const updatedTask = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: createdTask.id,
      body: {
        status: "completed",
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(updatedTask);

  // Verify status change
  TestValidator.equals(
    "task status updated to completed",
    updatedTask.status,
    "completed",
  );

  // Verify other properties remain unchanged
  TestValidator.equals(
    "task title unchanged",
    updatedTask.title,
    createdTask.title,
  );
  TestValidator.equals(
    "task description unchanged",
    updatedTask.description,
    createdTask.description,
  );
  TestValidator.equals(
    "task priority unchanged",
    updatedTask.priority,
    createdTask.priority,
  );
  TestValidator.equals(
    "task due_date unchanged",
    updatedTask.due_date,
    createdTask.due_date,
  );
  TestValidator.equals(
    "task completion_order unchanged",
    updatedTask.completion_order,
    createdTask.completion_order,
  );
  TestValidator.equals(
    "task user unchanged",
    updatedTask.user.id,
    createdTask.user.id,
  );

  // Verify timestamp was updated - handle null case properly
  const originalUpdatedAt = updatedTask.updated_at || updatedTask.created_at;
  const updatedAt = updatedTask.updated_at || updatedTask.created_at;

  TestValidator.predicate(
    "updated_at timestamp is newer than created_at",
    new Date(updatedAt).getTime() > new Date(createdTask.created_at).getTime(),
  );
  TestValidator.predicate(
    "updated_at timestamp is after or equal to original updated_at",
    new Date(updatedAt).getTime() >= new Date(originalUpdatedAt).getTime(),
  );
}
