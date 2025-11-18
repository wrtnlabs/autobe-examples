import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that tasks cannot be deleted by non-owners.
 *
 * This test validates the security boundary enforcement of the todo application
 * by ensuring that tasks can only be deleted by their rightful owners. The test
 * creates two separate user accounts, has one create a task, then verifies that
 * the second user is prevented from deleting that task through proper ownership
 * enforcement policies.
 *
 * @param connection - The API connection object
 * @returns A promise that resolves when the test completes
 */
export async function test_api_task_prevents_cross_user_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Create first user who will own the task
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: firstUserEmail,
      password: "password123",
      ip: "127.0.0.1",
      href: "https://example.com/auth",
      referrer: "https://example.com/join",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(firstUser);

  // Create a task as the first user
  const taskData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
  } satisfies ITodoAppTask.ICreate;

  const firstUserTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: taskData,
    },
  );
  typia.assert(firstUserTask);

  TestValidator.equals(
    "task owner should be first user",
    firstUserTask.user.id,
    firstUser.id,
  );

  // Create second user who should NOT be able to delete first user's task
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUser = await api.functional.auth.user.join(connection, {
    body: {
      email: secondUserEmail,
      password: "password456",
      ip: "127.0.0.1",
      href: "https://example.com/auth",
      referrer: "https://example.com/join",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(secondUser);

  // Verify second user is different from first user
  TestValidator.notEquals(
    "users should have different emails",
    secondUserEmail,
    firstUserEmail,
  );
  TestValidator.notEquals(
    "users should have different IDs",
    secondUser.id,
    firstUser.id,
  );

  // Attempt to delete the task as the second user (should fail due to ownership)
  await TestValidator.error(
    "second user should not be able to delete first user's task - ownership boundaries enforced",
    async () => {
      await api.functional.todoApp.user.tasks.erase(connection, {
        taskId: firstUserTask.id,
      });
    },
  );

  // Verify second user can create their own task (proves authentication works)
  const secondUserTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: "Second user task",
        description: "Task created by second user to verify authentication",
        priority: "Low",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(secondUserTask);

  // Verify second user cannot delete their own task (different from first user's task)
  TestValidator.notEquals(
    "second user task should have different ID",
    secondUserTask.id,
    firstUserTask.id,
  );
  TestValidator.equals(
    "second user task should belong to second user",
    secondUserTask.user.id,
    secondUser.id,
  );
}
