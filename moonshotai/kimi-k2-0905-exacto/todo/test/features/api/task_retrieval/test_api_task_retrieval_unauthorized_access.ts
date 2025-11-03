import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test task retrieval with invalid ownership verification. This scenario
 * ensures that users cannot access tasks belonging to other users, validating
 * proper authorization enforcement.
 */
export async function test_api_task_retrieval_unauthorized_access(
  connection: api.IConnection,
) {
  // Step 1: Create first user account with separate connection
  const firstUserConnection = { ...connection };
  const firstUser = await api.functional.auth.user.join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test123456",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(firstUser);

  // Step 2: Create a task for the first user
  const firstUserTask = await api.functional.todo.user.todo.tasks.create(
    firstUserConnection,
    {
      body: {
        description: RandomGenerator.paragraph({ sentences: 2 }),
        href: "https://example.com/todo",
        referrer: "https://example.com",
        business_status: "pending",
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert(firstUserTask);

  // Step 3: Create second user account with separate connection
  const secondUserConnection = { ...connection };
  const secondUser = await api.functional.auth.user.join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test123456",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(secondUser);

  // Step 4: Create a task for the second user
  const secondUserTask = await api.functional.todo.user.todo.tasks.create(
    secondUserConnection,
    {
      body: {
        description: RandomGenerator.paragraph({ sentences: 2 }),
        href: "https://example.com/todo",
        referrer: "https://example.com",
        business_status: "pending",
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert(secondUserTask);

  // Step 5: Attempt to retrieve first user's task using second user's auth (should fail)
  await TestValidator.error(
    "Should reject unauthorized access to another user's task",
    async () => {
      await api.functional.todo.user.users.tasks.at(secondUserConnection, {
        userId: firstUser.id,
        taskId: firstUserTask.id,
      });
    },
  );

  // Step 6: Verify second user can access their own tasks
  const ownTask = await api.functional.todo.user.users.tasks.at(
    secondUserConnection,
    {
      userId: secondUser.id,
      taskId: secondUserTask.id,
    },
  );
  typia.assert(ownTask);
  TestValidator.equals(
    "Task description matches",
    ownTask.description,
    secondUserTask.description,
  );
  TestValidator.equals(
    "Task belongs to correct user",
    ownTask.user.id,
    secondUser.id,
  );
}
