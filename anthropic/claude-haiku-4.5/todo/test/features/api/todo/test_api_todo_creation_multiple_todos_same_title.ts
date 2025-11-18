import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that multiple todos can be created with identical titles by the same
 * user.
 *
 * This test validates that the Todo List application allows users to create
 * multiple todos with the same title. Each todo should be stored separately
 * with a unique ID, confirming that title uniqueness is not enforced.
 *
 * Test flow:
 *
 * 1. Register a new user account
 * 2. Create first todo with a specific title
 * 3. Create second todo with the same title
 * 4. Verify both todos are accepted and stored
 * 5. Verify both todos have different IDs
 * 6. Verify both todos have the same title
 */
export async function test_api_todo_creation_multiple_todos_same_title(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);

  const joinResponse = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(joinResponse);

  // Step 2: Create first todo with a specific title
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });

  const firstTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: todoTitle,
        description: RandomGenerator.paragraph({ sentences: 5 }),
        priority: RandomGenerator.pick(["low", "medium", "high"] as const),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(firstTodo);

  // Step 3: Create second todo with the same title
  const secondTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: todoTitle,
        description: RandomGenerator.paragraph({ sentences: 5 }),
        priority: RandomGenerator.pick(["low", "medium", "high"] as const),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(secondTodo);

  // Step 4: Verify both todos are accepted and stored
  TestValidator.predicate(
    "first todo should have valid ID",
    firstTodo.id !== null && firstTodo.id !== undefined,
  );
  TestValidator.predicate(
    "second todo should have valid ID",
    secondTodo.id !== null && secondTodo.id !== undefined,
  );

  // Step 5: Verify both todos have different IDs
  TestValidator.notEquals(
    "todos should have different IDs despite same title",
    firstTodo.id,
    secondTodo.id,
  );

  // Step 6: Verify both todos have the same title
  TestValidator.equals(
    "both todos should have identical title",
    firstTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "second todo title should match first",
    secondTodo.title,
    todoTitle,
  );

  // Additional validation: Verify completion status is false for both
  TestValidator.predicate(
    "first todo should be incomplete",
    firstTodo.completed === false,
  );
  TestValidator.predicate(
    "second todo should be incomplete",
    secondTodo.completed === false,
  );
}
