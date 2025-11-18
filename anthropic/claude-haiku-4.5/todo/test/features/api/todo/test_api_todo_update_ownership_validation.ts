import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that users can only update todos they own.
 *
 * This test validates ownership enforcement in the todo update API by:
 *
 * 1. Creating two separate user accounts (user1 and user2)
 * 2. Having user1 authenticate and create a todo item
 * 3. Switching to user2's authentication context
 * 4. Attempting to update the todo created by user1 as user2
 * 5. Verifying that the update is rejected with an unauthorized/forbidden error
 *
 * This ensures the API correctly enforces authorization rules, preventing users
 * from modifying todos that belong to other users, thus protecting data
 * integrity and user privacy.
 */
export async function test_api_todo_update_ownership_validation(
  connection: api.IConnection,
) {
  // Step 1: Create first user account (user1) and authenticate
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Password = "TestPassword123";
  const user1Data = {
    email: user1Email,
    password: user1Password,
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000",
  } satisfies ITodoListUser.ICreate;

  const user1 = await api.functional.auth.user.join(connection, {
    body: user1Data,
  });
  typia.assert(user1);

  // Step 2: Create a todo as user1
  const todoCreateData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    priority: "high" as const,
    due_date: new Date(Date.now() + 86400000).toISOString(),
  } satisfies ITodoListTodo.ICreate;

  const user1Todo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: todoCreateData,
    },
  );
  typia.assert(user1Todo);

  // Step 3: Create second user account (user2)
  // This automatically updates the connection with user2's authentication token
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Password = "TestPassword456";
  const user2Data = {
    email: user2Email,
    password: user2Password,
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000",
  } satisfies ITodoListUser.ICreate;

  const user2 = await api.functional.auth.user.join(connection, {
    body: user2Data,
  });
  typia.assert(user2);

  // Step 4: Attempt to update user1's todo as user2 (should fail with authorization error)
  const updateData = {
    title: "Hacked Todo Title",
    completed: true,
  } satisfies ITodoListTodo.IUpdate;

  await TestValidator.error(
    "user2 should not be able to update user1's todo due to ownership validation",
    async () => {
      await api.functional.todoList.user.todos.update(connection, {
        todoId: user1Todo.id,
        body: updateData,
      });
    },
  );
}
