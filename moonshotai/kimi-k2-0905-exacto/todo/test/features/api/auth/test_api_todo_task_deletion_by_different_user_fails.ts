import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test that a user cannot delete tasks belonging to another user.
 *
 * This test validates task ownership restrictions by creating two separate
 * users with their own authentication contexts. The first user creates a task,
 * then the second user attempts to delete it. The system should reject
 * unauthorized deletion attempts to maintain proper data isolation between
 * users.
 *
 * Workflow:
 *
 * 1. Create User A and authenticate
 * 2. Create User B and authenticate
 * 3. User A creates a task (establishing ownership)
 * 4. User B attempts to delete User A's task
 * 5. Validate that the deletion fails appropriately
 */
export async function test_api_todo_task_deletion_by_different_user_fails(
  connection: api.IConnection,
) {
  // Create first user (User A) who will create a task
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userA = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: "password123",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(userA);

  // Create second user (User B) who will attempt to delete User A's task
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userB = await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      password: "password123",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(userB);

  // User A creates a task (using the existing connection which has User A's auth)
  const taskCreated = await api.functional.todo.user.todo.tasks.create(
    connection,
    {
      body: {
        description: RandomGenerator.paragraph(),
        business_status: null,
        ip: null,
        href: "https://example.com/todo",
        referrer: "https://example.com",
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert(taskCreated);

  // Verify the task belongs to User A
  TestValidator.equals(
    "task user id matches user A",
    taskCreated.user.id,
    userA.id,
  );

  // Switch to User B's authentication context
  // Create a new connection with User B's credentials
  const connectionB: api.IConnection = {
    ...connection,
    headers: {
      Authorization: `Bearer ${userB.token.access}`,
    },
  };

  // User B attempts to delete User A's task - this should fail
  await TestValidator.error(
    "different user cannot delete another user's task",
    async () => {
      return await api.functional.todo.user.todo.tasks.erase(connectionB, {
        taskId: taskCreated.id,
      });
    },
  );
}
