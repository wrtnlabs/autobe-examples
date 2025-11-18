import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test updating a task's priority to High.
 *
 * This test validates the priority escalation workflow in the todo application.
 * The workflow involves:
 *
 * 1. Creating a user account for authentication context
 * 2. Creating a task with Low priority
 * 3. Updating the task priority to High
 * 4. Verifying the priority change and task integrity
 *
 * The test ensures proper priority field validation and confirms that the
 * priority change is successful while maintaining task integrity with all other
 * properties preserved.
 */
export async function test_api_task_update_priority_high(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      ip: "127.0.0.1",
      href: "https://example.com",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create task with Low priority
  const lowPriorityTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Complete quarterly report",
        description: "Prepare and submit the Q4 financial report",
        priority: "Low",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(lowPriorityTask);

  // Step 3: Update task priority to High
  const updatedTask = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: lowPriorityTask.id,
      body: {
        priority: "High",
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(updatedTask);

  // Step 4: Verify priority change and task integrity
  TestValidator.equals(
    "Task priority updated correctly",
    updatedTask.priority,
    "High",
  );
  TestValidator.equals("Task ID preserved", updatedTask.id, lowPriorityTask.id);
  TestValidator.equals(
    "Task title preserved",
    updatedTask.title,
    lowPriorityTask.title,
  );
  TestValidator.equals(
    "Task description preserved",
    updatedTask.description,
    lowPriorityTask.description,
  );
  TestValidator.equals(
    "Task status preserved",
    updatedTask.status,
    lowPriorityTask.status,
  );
  TestValidator.equals("Task user preserved", updatedTask.user.id, user.id);
  TestValidator.notEquals(
    "Updated timestamp changed",
    updatedTask.updated_at,
    lowPriorityTask.updated_at,
  );
}
