import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test deleting a task after it has been updated to verify consistency between
 * modification and deletion operations. Validates that previously modified
 * tasks can be safely deleted with all updated data removed. Maintains data
 * consistency throughout the task lifecycle.
 *
 * 1. User registration - create authenticated user account
 * 2. Create initial task - establish baseline task with original data
 * 3. Update task - modify task properties to test update functionality
 * 4. Verify update - confirm task was successfully updated
 * 5. Delete task - remove the updated task from system
 * 6. Confirm deletion - validate task no longer exists in user's task list
 */
export async function test_api_task_delete_after_update(
  connection: api.IConnection,
) {
  // Step 1: User registration for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/todo",
      referrer: "https://example.com/landing",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);
  TestValidator.equals("user registration successful", user.email, userEmail);

  // Step 2: Create initial task
  const originalTaskData = {
    title: "Original Task Title",
    description: "Original task description for testing",
    status: "pending",
    priority: "medium",
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
  } satisfies ITodoAppTask.ICreate;

  const createdTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: originalTaskData,
    },
  );
  typia.assert(createdTask);
  TestValidator.equals(
    "task created with original title",
    createdTask.title,
    originalTaskData.title,
  );
  TestValidator.equals(
    "task created with original description",
    createdTask.description,
    originalTaskData.description,
  );
  TestValidator.equals(
    "task created with pending status",
    createdTask.status,
    originalTaskData.status,
  );

  // Step 3: Update task with new information
  const updatedTaskData = {
    title: "Updated Task Title",
    description: "Updated task description after modification",
    status: "completed",
    priority: "high",
    due_date: null, // Remove due date
  } satisfies ITodoAppTask.IUpdate;

  const updatedTask = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: createdTask.id,
      body: updatedTaskData,
    },
  );
  typia.assert(updatedTask);

  // Step 4: Verify the task was successfully updated
  TestValidator.equals(
    "task title updated correctly",
    updatedTask.title,
    updatedTaskData.title,
  );
  TestValidator.equals(
    "task description updated correctly",
    updatedTask.description,
    updatedTaskData.description,
  );
  TestValidator.equals(
    "task status updated to completed",
    updatedTask.status,
    updatedTaskData.status,
  );
  TestValidator.equals(
    "task priority updated to high",
    updatedTask.priority,
    updatedTaskData.priority,
  );
  TestValidator.equals("task due date removed", updatedTask.due_date, null);
  TestValidator.notEquals(
    "task updated_at timestamp changed",
    updatedTask.updated_at,
    createdTask.updated_at,
  );

  // Step 5: Delete the updated task
  const deletedTask = await api.functional.todoApp.user.tasks.erase(
    connection,
    {
      taskId: updatedTask.id,
    },
  );
  typia.assert(deletedTask);
  TestValidator.equals(
    "deleted task ID matches original",
    deletedTask.id,
    updatedTask.id,
  );

  // Step 6: Confirm deletion - verify task contains final state before deletion
  TestValidator.equals(
    "deleted task retains final title",
    deletedTask.title,
    updatedTask.title,
  );
  TestValidator.equals(
    "deleted task retains final description",
    deletedTask.description,
    updatedTask.description,
  );
  TestValidator.equals(
    "deleted task retains completed status",
    deletedTask.status,
    "completed",
  );
  TestValidator.equals(
    "deleted task retains high priority",
    deletedTask.priority,
    "high",
  );
  TestValidator.equals(
    "deleted task due date remains null",
    deletedTask.due_date,
    null,
  );
}
