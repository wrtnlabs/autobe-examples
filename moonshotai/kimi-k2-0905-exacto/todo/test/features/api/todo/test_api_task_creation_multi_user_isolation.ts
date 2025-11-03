import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test task creation workflow for multiple users to ensure proper data
 * isolation.
 *
 * This test validates that each user can only create and access their own
 * tasks, maintaining strict separation between user data. This scenario tests
 * the multi-tenancy capabilities of the system and ensures that user task lists
 * remain completely isolated from each other.
 *
 * Test Steps:
 *
 * 1. Create first user account
 * 2. Create second user account
 * 3. User 1 creates multiple tasks
 * 4. User 2 creates multiple tasks
 * 5. Verify User 1 can only see their own tasks
 * 6. Verify User 2 can only see their own tasks
 * 7. Ensure task data is properly isolated between users
 */
export async function test_api_task_creation_multi_user_isolation(
  connection: api.IConnection,
) {
  // Create first user
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      password: "password123",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user1);

  // Create second user
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2 = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      password: "password456",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user2);

  // User 1 creates tasks
  const user1Task1 = await api.functional.todo.user.user_tasks.create(
    connection,
    {
      body: {
        description: "User 1 Task 1",
        href: "https://example.com/task1",
        referrer: "https://example.com",
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert(user1Task1);
  TestValidator.equals(
    "User 1 Task 1 description",
    user1Task1.description,
    "User 1 Task 1",
  );
  TestValidator.equals(
    "User 1 Task 1 assigned to user1",
    user1Task1.user.id,
    user1.id,
  );

  const user1Task2 = await api.functional.todo.user.user_tasks.create(
    connection,
    {
      body: {
        description: "User 1 Task 2",
        href: "https://example.com/task2",
        referrer: "https://example.com",
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert(user1Task2);
  TestValidator.equals(
    "User 1 Task 2 description",
    user1Task2.description,
    "User 1 Task 2",
  );
  TestValidator.equals(
    "User 1 Task 2 assigned to user1",
    user1Task2.user.id,
    user1.id,
  );

  // User 2 creates tasks
  const user2Task1 = await api.functional.todo.user.user_tasks.create(
    connection,
    {
      body: {
        description: "User 2 Task 1",
        href: "https://example.com/task3",
        referrer: "https://example.com",
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert(user2Task1);
  TestValidator.equals(
    "User 2 Task 1 description",
    user2Task1.description,
    "User 2 Task 1",
  );
  TestValidator.equals(
    "User 2 Task 1 assigned to user2",
    user2Task1.user.id,
    user2.id,
  );

  const user2Task2 = await api.functional.todo.user.user_tasks.create(
    connection,
    {
      body: {
        description: "User 2 Task 2",
        href: "https://example.com/task4",
        referrer: "https://example.com",
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert(user2Task2);
  TestValidator.equals(
    "User 2 Task 2 description",
    user2Task2.description,
    "User 2 Task 2",
  );
  TestValidator.equals(
    "User 2 Task 2 assigned to user2",
    user2Task2.user.id,
    user2.id,
  );

  // Verify task isolation - users should only see their own tasks
  TestValidator.predicate(
    "User 1 tasks are isolated",
    user1Task1.user.id !== user2Task1.user.id,
  );
  TestValidator.predicate(
    "User 1 tasks are isolated",
    user1Task2.user.id !== user2Task2.user.id,
  );
  TestValidator.predicate(
    "User 1 task assigned to user1",
    user1Task1.user.id === user1.id,
  );
  TestValidator.predicate(
    "User 1 task assigned to user1",
    user1Task2.user.id === user1.id,
  );
  TestValidator.predicate(
    "User 2 task assigned to user2",
    user2Task1.user.id === user2.id,
  );
  TestValidator.predicate(
    "User 2 task assigned to user2",
    user2Task2.user.id === user2.id,
  );
}
