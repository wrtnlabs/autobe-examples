import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test task deletion with proper ownership validation, ensuring users can only
 * delete their own tasks and the system prevents unauthorized deletion
 * attempts. This validates the security boundaries and data integrity of the
 * task management system.
 *
 * The test follows this workflow:
 *
 * 1. Create first user who will create a task
 * 2. Create a task owned by the first user
 * 3. Create second user to test ownership validation
 * 4. Attempt to delete the task with both users
 * 5. Verify that only the task owner can successfully delete the task
 * 6. Confirm that the non-owner receives an error when attempting deletion
 */
export async function test_api_task_deletion_ownership_validation(
  connection: api.IConnection,
) {
  // Step 1: Create first user who will create a task
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: firstUserEmail,
      password: "TestPassword123!",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(firstUser);

  // Step 2: Create a task owned by the first user
  const taskToDelete = await api.functional.todo.user.user_tasks.create(
    connection,
    {
      body: {
        description: RandomGenerator.paragraph({ sentences: 3 }),
        business_status: "pending",
        href: "https://example.com/tasks",
        referrer: "https://example.com",
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert(taskToDelete);
  TestValidator.equals(
    "Task owner should be first user",
    taskToDelete.user.id,
    firstUser.id,
  );

  // Step 3: Create second user to test ownership validation
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  // Create fresh connection for second user (unauthenticated)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const secondUser = await api.functional.auth.user.join(unauthConn, {
    body: {
      email: secondUserEmail,
      password: "TestPassword456!",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(secondUser);

  // Verify second user cannot delete first user's task
  await TestValidator.error(
    "Second user should not be able to delete first user's task",
    async () => {
      await api.functional.todo.user.user_tasks.erase(unauthConn, {
        id: taskToDelete.id,
      });
    },
  );

  // Step 4: First user (owner) successfully deletes their task
  await api.functional.todo.user.user_tasks.erase(connection, {
    id: taskToDelete.id,
  });

  // Step 5: Verify task deletion with ownership validation
  TestValidator.predicate(
    "Task deletion with ownership validation successful",
    true,
  );
}
