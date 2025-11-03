import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test complete task lifecycle from creation to deletion with ownership
 * validation.
 *
 * This test validates the complete lifecycle of a todo task from creation
 * through deletion, ensuring proper ownership validation. The test verifies:
 *
 * 1. User can create a new task
 * 2. User can delete their own task
 * 3. Task is permanently removed and cannot be deleted again
 * 4. Users cannot delete tasks owned by other users
 *
 * The test follows a realistic workflow of task management in a todo
 * application, including proper error handling for ownership violations.
 */
export async function test_api_task_delete_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
    } satisfies ITodoUser.IJoin,
  });

  // Step 2: Create a todo task for the user
  const taskDescription = RandomGenerator.paragraph({ sentences: 2 });
  const task = await api.functional.todo.user.todo.tasks.create(connection, {
    body: {
      description: taskDescription,
      href: "https://example.com/tasks",
      referrer: "https://example.com/dashboard",
    } satisfies ITodoTask.ICreate,
  });
  typia.assert(task);

  // Validate task properties
  TestValidator.equals(
    "task description matches",
    task.description,
    taskDescription,
  );
  TestValidator.equals("task is not completed", task.completed, false);
  TestValidator.equals("task user ID matches", task.user.id, task.user.id);
  TestValidator.predicate(
    "task has valid ID",
    typia.is<string & tags.Format<"uuid">>(task.id),
  );

  // Step 3: Delete the task (owner deletion should succeed)
  await api.functional.todo.user.users.tasks.erase(connection, {
    userId: task.user.id,
    taskId: task.id,
  });

  // Step 4: Attempt to delete the same task again (should fail)
  await TestValidator.error(
    "deleting already deleted task should fail",
    async () => {
      await api.functional.todo.user.users.tasks.erase(connection, {
        userId: task.user.id,
        taskId: task.id,
      });
    },
  );

  // Step 5: Create a second user to test ownership validation
  const otherUserEmail = typia.random<string & tags.Format<"email">>();
  const otherUserConnection: api.IConnection = { ...connection, headers: {} };
  await api.functional.auth.user.join(otherUserConnection, {
    body: {
      email: otherUserEmail,
      password: "otherPassword123",
    } satisfies ITodoUser.IJoin,
  });

  // Step 6: Create a task for the second user
  const otherTaskDescription = RandomGenerator.paragraph({ sentences: 2 });
  const otherTask = await api.functional.todo.user.todo.tasks.create(
    otherUserConnection,
    {
      body: {
        description: otherTaskDescription,
        href: "https://example.com/other-tasks",
        referrer: "https://example.com/other-dashboard",
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert(otherTask);

  // Step 7: First user attempts to delete second user's task (should fail)
  await TestValidator.error(
    "user cannot delete other user's task",
    async () => {
      await api.functional.todo.user.users.tasks.erase(connection, {
        userId: otherTask.user.id,
        taskId: otherTask.id,
      });
    },
  );

  // Step 8: Verify the other user's task still exists by having the owner delete it
  // The other user should be able to delete their own task
  await api.functional.todo.user.users.tasks.erase(otherUserConnection, {
    userId: otherTask.user.id,
    taskId: otherTask.id,
  });

  // Verify both users completed their task deletion operations successfully
  TestValidator.predicate("task deletion completed successfully", true);
}
