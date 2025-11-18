import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test deleting the same todo twice to validate idempotent-safe deletion.
 *
 * This test verifies that the deletion API properly handles deletion of
 * already-deleted items by attempting to delete the same todo twice.
 *
 * Process:
 *
 * 1. Register a new user account
 * 2. Create a new todo item with title and description
 * 3. Delete the todo item successfully
 * 4. Attempt to delete the same todo item again
 * 5. Verify that the second deletion returns a not-found error
 */
export async function test_api_todo_deletion_double_delete_attempt(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const userCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: userCreateData,
  });
  typia.assert(registeredUser);
  TestValidator.equals(
    "registered user email matches input",
    registeredUser.email,
    userCreateData.email,
  );

  // Step 2: Create a new todo item
  const todoCreateData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 6 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    priority: RandomGenerator.pick(["low", "medium", "high"] as const),
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } satisfies ITodoListTodo.ICreate;

  const createdTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: todoCreateData,
    },
  );
  typia.assert(createdTodo);
  TestValidator.equals(
    "created todo title matches input",
    createdTodo.title,
    todoCreateData.title,
  );
  TestValidator.equals(
    "created todo completed status is false",
    createdTodo.completed,
    false,
  );

  // Step 3: Delete the todo item successfully
  await api.functional.todoList.user.todos.erase(connection, {
    todoId: createdTodo.id,
  });

  // Step 4 & 5: Attempt to delete the same todo item again and verify error
  await TestValidator.error(
    "second deletion attempt should return not-found error",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: createdTodo.id,
      });
    },
  );
}
