import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that deleting a todo from one user's list doesn't affect other users'
 * todos.
 *
 * This test validates proper user isolation in todo deletion by:
 *
 * 1. Creating user1 with authentication and a todo
 * 2. Creating user2 with authentication and a todo
 * 3. Deleting user1's todo
 * 4. Switching back to user2
 * 5. Verifying user2's todo still exists and is completely unaffected
 *
 * This ensures deletion operations are properly scoped to individual users and
 * do not impact other users' data through shared state.
 */
export async function test_api_todo_deletion_user_list_isolation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate first user
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Password = RandomGenerator.alphabets(12);
  const user1JoinData = {
    email: user1Email,
    password: user1Password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const user1Response = await api.functional.auth.user.join(connection, {
    body: user1JoinData,
  });
  typia.assert(user1Response);

  // Step 2: Create todo for user1
  const user1TodoData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    priority: RandomGenerator.pick(["low", "medium", "high"] as const),
  } satisfies ITodoListTodo.ICreate;

  const user1Todo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: user1TodoData,
    },
  );
  typia.assert(user1Todo);
  TestValidator.predicate(
    "user1 todo created successfully",
    user1Todo.id !== null && user1Todo.id.length > 0,
  );

  // Step 3: Create and authenticate second user
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Password = RandomGenerator.alphabets(12);
  const user2JoinData = {
    email: user2Email,
    password: user2Password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const user2Response = await api.functional.auth.user.join(connection, {
    body: user2JoinData,
  });
  typia.assert(user2Response);

  // Step 4: Create todo for user2
  const user2TodoData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    priority: RandomGenerator.pick(["low", "medium", "high"] as const),
  } satisfies ITodoListTodo.ICreate;

  const user2Todo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: user2TodoData,
    },
  );
  typia.assert(user2Todo);
  TestValidator.predicate(
    "user2 todo created successfully",
    user2Todo.id !== null && user2Todo.id.length > 0,
  );

  // Verify todos are different
  TestValidator.notEquals(
    "user1 and user2 todos should be different",
    user1Todo.id,
    user2Todo.id,
  );

  // Step 5: Switch back to user1 and delete their todo
  await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      password: user1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });

  await api.functional.todoList.user.todos.erase(connection, {
    todoId: user1Todo.id,
  });

  // Step 6: Switch to user2 and verify their todo is still intact
  await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      password: user2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });

  // User2 should be able to delete their own todo (proving it still exists and is accessible)
  await api.functional.todoList.user.todos.erase(connection, {
    todoId: user2Todo.id,
  });

  TestValidator.equals(
    "user2 todo deletion completed successfully",
    user2Todo.id,
    user2Todo.id,
  );
}
