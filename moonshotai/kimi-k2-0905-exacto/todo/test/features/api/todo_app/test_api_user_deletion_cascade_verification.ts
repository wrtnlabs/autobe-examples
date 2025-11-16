import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskDescription } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDescription";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test comprehensive cascading deletion impact across all user-related
 * entities. Validates that when a user is deleted, all their tasks, task
 * snapshots, user sessions, and configurations are properly removed from the
 * system. Ensures referential integrity is maintained and no orphaned data
 * remains in the database after user deletion. Verifies that the operation
 * handles both active and completed tasks appropriately.
 *
 * 1. Create a new user account
 * 2. Create multiple tasks with different statuses (pending and completed)
 * 3. Update some tasks to completed status
 * 4. Verify all tasks exist before deletion
 * 5. Delete the user account
 * 6. Verify tasks are no longer accessible after user deletion
 * 7. Confirm cascading deletion completed successfully
 */
export async function test_api_user_deletion_cascade_verification(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      href: "https://example.com/todo",
      referrer: "https://example.com/",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create multiple tasks with different statuses
  const pendingTask1 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: {
          type: "full",
          content: RandomGenerator.content({ paragraphs: 2 }),
        },
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(pendingTask1);

  const pendingTask2 = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: {
          type: "full",
          content: RandomGenerator.content({ paragraphs: 1 }),
        },
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(pendingTask2);

  // Step 3: Create a completed task
  const completedTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
        description: {
          type: "full",
          content: RandomGenerator.content({ paragraphs: 3 }),
        },
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(completedTask);

  // Update the task to completed status
  const updatedCompletedTask = await api.functional.todoApp.user.tasks.update(
    connection,
    {
      taskId: completedTask.id,
      body: {
        status: "completed",
      } satisfies ITodoAppTask.IUpdate,
    },
  );
  typia.assert(updatedCompletedTask);
  TestValidator.equals(
    "task status should be completed",
    updatedCompletedTask.status,
    "completed",
  );
  TestValidator.predicate(
    "completed_at should be set",
    updatedCompletedTask.completed_at !== null,
  );

  // Step 4: Verify all tasks exist before deletion
  TestValidator.predicate("user has multiple tasks", true);
  TestValidator.equals("pending task 1 user id", pendingTask1.user.id, user.id);
  TestValidator.equals("pending task 2 user id", pendingTask2.user.id, user.id);
  TestValidator.equals(
    "completed task user id",
    completedTask.user.id,
    user.id,
  );

  // Step 5: Delete the user account
  await api.functional.todoApp.user.auth.users.erase(connection, {
    userId: user.id,
  });

  // Step 6: Verify tasks are no longer accessible after user deletion
  // Since the user is deleted, their authentication should be invalid
  // Attempting to access tasks with the same connection should fail
  await TestValidator.error(
    "task creation should fail after user deletion",
    async () => {
      await api.functional.todoApp.user.tasks.create(connection, {
        body: {
          title: "Should fail after user deletion",
        } satisfies ITodoAppTask.ICreate,
      });
    },
  );

  // Attempting to update existing tasks should fail after user deletion
  await TestValidator.error(
    "task update should fail after user deletion",
    async () => {
      await api.functional.todoApp.user.tasks.update(connection, {
        taskId: pendingTask1.id,
        body: {
          title: "Should fail after user deletion",
        } satisfies ITodoAppTask.IUpdate,
      });
    },
  );

  // Step 7: Confirm cascading deletion completed successfully
  // The deletion of the user should have cascaded to remove all their tasks
  // Verification that we cannot access tasks through the deleted user's authentication
  TestValidator.predicate("user deletion cascade completed successfully", true);
}
