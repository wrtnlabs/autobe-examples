import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskDescription } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDescription";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test authorization enforcement for task retrieval operations. This scenario
 * validates that users cannot access tasks owned by other users, ensuring
 * proper access control and data privacy. The test creates multiple user
 * accounts and tasks, then attempts to access tasks across different user
 * boundaries to verify security boundaries are properly enforced.
 */
export async function test_api_task_retrieval_access_control(
  connection: api.IConnection,
) {
  // Step 1: Create first user account
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: firstUserEmail,
      password: "Test1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(firstUser);

  // Step 2: Create a task for the first user
  const firstUserTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.name(3), // 3 words as title
        description: {
          type: "full",
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(firstUserTask);

  // Step 3: Create second user account
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUser = await api.functional.auth.user.join(connection, {
    body: {
      email: secondUserEmail,
      password: "Test1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });

  // Step 4: Attempt to access first user's task from second user context
  await TestValidator.error(
    "second user should not access first user's task",
    async () => {
      await api.functional.todoApp.user.tasks.at(connection, {
        taskId: firstUserTask.id,
      });
    },
  );

  // Step 5: Create task for second user
  const secondUserTask = await api.functional.todoApp.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.name(2), // 2 words as title
        description: {
          type: "full",
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(secondUserTask);

  // Step 6: Verify each user can only access their own tasks
  // First user should be able to access their own task
  const retrievedFirstUserTask = await api.functional.todoApp.user.tasks.at(
    connection,
    {
      taskId: firstUserTask.id,
    },
  );
  typia.assert(retrievedFirstUserTask);
  TestValidator.equals(
    "retrieved first user task matches original",
    retrievedFirstUserTask.id,
    firstUserTask.id,
  );

  // Second user should be able to access their own task
  const retrievedSecondUserTask = await api.functional.todoApp.user.tasks.at(
    connection,
    {
      taskId: secondUserTask.id,
    },
  );
  typia.assert(retrievedSecondUserTask);
  TestValidator.equals(
    "retrieved second user task matches original",
    retrievedSecondUserTask.id,
    secondUserTask.id,
  );

  // Step 7: Verify user object containment for non-null assertion
  if (!retrievedFirstUserTask.user || !retrievedSecondUserTask.user) {
    throw new Error("User information must be present in task response");
  }

  // Step 8: Verify user ownership details
  TestValidator.equals(
    "first task belongs to correct user",
    retrievedFirstUserTask.user.id,
    firstUser.id,
  );
  TestValidator.equals(
    "second task belongs to correct user",
    retrievedSecondUserTask.user.id,
    secondUser.id,
  );
  TestValidator.equals(
    "first user email matches",
    retrievedFirstUserTask.user.email,
    firstUserEmail,
  );
}
