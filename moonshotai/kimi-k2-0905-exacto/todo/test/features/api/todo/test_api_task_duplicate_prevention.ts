import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test duplicate task description prevention through composite unique
 * constraint.
 *
 * This test validates that the system properly enforces the composite unique
 * constraint on (user_id, description) to prevent duplicate tasks within a
 * single user's task list. It verifies that:
 *
 * 1. Users can create tasks with unique descriptions
 * 2. Users cannot create tasks with duplicate descriptions (same description as
 *    existing task)
 * 3. Different users can have tasks with identical descriptions (constraint is
 *    per-user)
 * 4. The system provides appropriate error handling for duplicate attempts
 *
 * Test workflow:
 *
 * 1. Create first user account and authenticate
 * 2. Create initial task with specific description for first user
 * 3. Attempt to create second task with identical description for same user
 *    (should fail)
 * 4. Create second user account and authenticate
 * 5. Create task with same description for second user (should succeed)
 * 6. Verify task counts and data integrity
 */
export async function test_api_task_duplicate_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create first user account
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: firstUserEmail,
      password: "testPassword123",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert<ITodoUser.IAuthorized>(firstUser);

  // Step 2: Create initial task with specific description for first user
  const taskDescription = "Complete quarterly financial report";
  const firstTask = await api.functional.todo.user.users.tasks.create(
    connection,
    {
      userId: firstUser.id,
      body: {
        description: taskDescription,
        href: "https://example.com/dashboard",
        referrer: "https://example.com/tasks",
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert<ITodoTask>(firstTask);
  TestValidator.equals(
    "first task description",
    firstTask.description,
    taskDescription,
  );
  TestValidator.equals("first task user", firstTask.user.id, firstUser.id);

  // Step 3: Attempt to create second task with identical description for same user (should fail)
  await TestValidator.error(
    "duplicate task description should be prevented for same user",
    async () => {
      await api.functional.todo.user.users.tasks.create(connection, {
        userId: firstUser.id,
        body: {
          description: taskDescription,
          href: "https://example.com/dashboard",
          referrer: "https://example.com/tasks",
        } satisfies ITodoTask.ICreate,
      });
    },
  );

  // Step 4: Create second user account
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUser = await api.functional.auth.user.join(connection, {
    body: {
      email: secondUserEmail,
      password: "testPassword456",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert<ITodoUser.IAuthorized>(secondUser);

  // Step 5: Create task with same description for second user (should succeed)
  const secondUserTask = await api.functional.todo.user.users.tasks.create(
    connection,
    {
      userId: secondUser.id,
      body: {
        description: taskDescription,
        href: "https://example.com/dashboard",
        referrer: "https://example.com/tasks",
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert<ITodoTask>(secondUserTask);
  TestValidator.equals(
    "second user task description",
    secondUserTask.description,
    taskDescription,
  );
  TestValidator.equals(
    "second user task user",
    secondUserTask.user.id,
    secondUser.id,
  );
  TestValidator.notEquals(
    "tasks have different IDs",
    firstTask.id,
    secondUserTask.id,
  );

  // Step 6: Verify task counts and data integrity
  TestValidator.equals("first user task count", firstUser.tasks_count, 1);
  TestValidator.equals("second user task count", secondUser.tasks_count, 1);
}
