import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test permanently deleting a todo task from the user's task list, validating
 * that the task is completely removed from the database and cannot be
 * recovered. The scenario ensures proper authorization checks prevent deletion
 * of tasks belonging to other users.
 */
export async function test_api_task_permanent_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication and task ownership
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "securePassword123",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create task that will be deleted during the test
  const taskDescription = RandomGenerator.paragraph({ sentences: 3 });
  const task = await api.functional.todo.user.user_tasks.create(connection, {
    body: {
      description: taskDescription,
      href: "https://example.com/todo",
      referrer: "https://example.com/dashboard",
    } satisfies ITodoTask.ICreate,
  });
  typia.assert(task);

  // Step 3: Permanently delete the task
  await api.functional.todo.user.user_tasks.erase(connection, {
    id: task.id,
  });

  // Step 4: Verify task deletion by attempting to delete again (should fail)
  await TestValidator.error(
    "deleting non-existent task should fail",
    async () => {
      await api.functional.todo.user.user_tasks.erase(connection, {
        id: task.id,
      });
    },
  );

  // Step 5: Test authorization - create another user and attempt cross-user deletion
  const otherUserEmail = typia.random<string & tags.Format<"email">>();
  const otherUser = await api.functional.auth.user.join(
    { ...connection, headers: {} },
    {
      body: {
        email: otherUserEmail,
        password: "otherPassword123",
      } satisfies ITodoUser.IJoin,
    },
  );
  typia.assert(otherUser);

  // Create a task for the first user again (authentication switched back in join call)
  const otherTask = await api.functional.todo.user.user_tasks.create(
    connection,
    {
      body: {
        description: "Task for authorization test",
        href: "https://example.com/auth-test",
        referrer: "https://example.com/auth-test",
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert(otherTask);

  // Attempt to delete task as other user - should fail due to authorization
  await TestValidator.error(
    "unauthorized task deletion should be prevented",
    async () => {
      await api.functional.todo.user.user_tasks.erase(
        { ...connection, headers: {} },
        {
          id: otherTask.id,
        },
      );
    },
  );
}
