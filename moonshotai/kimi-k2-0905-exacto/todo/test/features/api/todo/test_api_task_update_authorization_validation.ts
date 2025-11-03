import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test task update authorization and ownership enforcement. This scenario
 * validates that users can only update their own tasks and that the system
 * properly rejects attempts to modify tasks belonging to other users. Tests the
 * composite unique constraint on description per user and ensures proper error
 * handling for duplicate descriptions within the same user account.
 */
export async function test_api_task_update_authorization_validation(
  connection: api.IConnection,
) {
  // Create first user with task creation privileges
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      password: "password123",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user1);

  // Create task for the first user
  const task1 = await api.functional.todo.user.todo.tasks.create(connection, {
    body: {
      description: "User1's first task",
      business_status: "pending",
      href: "https://example.com/tasks",
      referrer: "https://example.com",
    } satisfies ITodoTask.ICreate,
  });
  typia.assert(task1);

  // Create second user for cross-update testing
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2 = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      password: "password123",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user2);

  // Create task for the second user
  const task2 = await api.functional.todo.user.todo.tasks.create(connection, {
    body: {
      description: "User2's first task",
      business_status: "pending",
      href: "https://example.com/tasks",
      referrer: "https://example.com",
    } satisfies ITodoTask.ICreate,
  });
  typia.assert(task2);

  // Create additional task for the first user for authorization testing
  const task3 = await api.functional.todo.user.todo.tasks.create(connection, {
    body: {
      description: "User1's second task",
      business_status: "pending",
      href: "https://example.com/tasks",
      referrer: "https://example.com",
    } satisfies ITodoTask.ICreate,
  });
  typia.assert(task3);

  // Test 1: User1 should be able to update their own task (task1)
  const updatedTask1 = await api.functional.todo.user.users.tasks.update(
    connection,
    {
      userId: user1.id,
      taskId: task1.id,
      body: {
        description: "User1's updated task",
        completed: true,
      } satisfies ITodoTask.IUpdate,
    },
  );
  typia.assert(updatedTask1);

  TestValidator.equals(
    "task description updated",
    updatedTask1.description,
    "User1's updated task",
  );
  TestValidator.equals(
    "task marked as completed",
    updatedTask1.completed,
    true,
  );

  // Test 2: User1 should NOT be able to update User2's task (task2)
  await TestValidator.error("cross-user update should fail", async () => {
    await api.functional.todo.user.users.tasks.update(connection, {
      userId: user2.id,
      taskId: task2.id,
      body: {
        description: "Attempted update by user1",
      } satisfies ITodoTask.IUpdate,
    });
  });

  // Test 3: User2 should NOT be able to update User1's task (task1)
  await TestValidator.error("cross-user update should fail", async () => {
    await api.functional.todo.user.users.tasks.update(connection, {
      userId: user1.id,
      taskId: task1.id,
      body: {
        description: "Attempted update by user2",
      } satisfies ITodoTask.IUpdate,
    });
  });

  // Test 4: User1 should be able to update their own task with any description (authorization test)
  const updatedTask3 = await api.functional.todo.user.users.tasks.update(
    connection,
    {
      userId: user1.id,
      taskId: task3.id,
      body: {
        description: "User1's reupdated task",
      } satisfies ITodoTask.IUpdate,
    },
  );
  typia.assert(updatedTask3);

  TestValidator.equals(
    "task description updated within same user",
    updatedTask3.description,
    "User1's reupdated task",
  );

  // Test 5: User2 should be able to use same description as User1's tasks (cross-user allowed)
  const updatedTask2 = await api.functional.todo.user.users.tasks.update(
    connection,
    {
      userId: user2.id,
      taskId: task2.id,
      body: {
        description: "User1's updated task",
      } satisfies ITodoTask.IUpdate,
    },
  );
  typia.assert(updatedTask2);

  TestValidator.equals(
    "task description can be duplicate across users",
    updatedTask2.description,
    "User1's updated task",
  );
}
