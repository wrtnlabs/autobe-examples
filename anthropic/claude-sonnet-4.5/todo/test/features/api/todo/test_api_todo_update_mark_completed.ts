import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test marking an incomplete todo item as completed.
 *
 * This test validates that partial updates work correctly when marking a todo
 * as complete. It ensures the system automatically manages the completed_at
 * timestamp while preserving unchanged fields like the title.
 *
 * Test workflow:
 *
 * 1. Create a new user account for todo ownership
 * 2. Create an incomplete todo item
 * 3. Update only the completed field to true
 * 4. Verify completed status, completed_at timestamp, unchanged title, and
 *    updated_at
 */
export async function test_api_todo_update_mark_completed(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create an incomplete todo item
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const createdTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: todoTitle,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(createdTodo);

  // Verify initial state: todo should be incomplete
  TestValidator.equals(
    "initial completed status",
    createdTodo.completed,
    false,
  );
  TestValidator.equals(
    "initial completed_at should be null",
    createdTodo.completed_at,
    null,
  );
  TestValidator.equals("initial title matches", createdTodo.title, todoTitle);

  // Step 3: Mark the todo as completed (partial update)
  const updatedTodo = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: createdTodo.id,
      body: {
        completed: true,
      } satisfies ITodoListTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);

  // Step 4: Verify the update results
  TestValidator.equals("completed status updated", updatedTodo.completed, true);
  TestValidator.predicate(
    "completed_at timestamp is populated",
    updatedTodo.completed_at !== null && updatedTodo.completed_at !== undefined,
  );
  TestValidator.equals("title remains unchanged", updatedTodo.title, todoTitle);
  TestValidator.equals(
    "todo ID remains the same",
    updatedTodo.id,
    createdTodo.id,
  );

  // Verify updated_at timestamp changed
  TestValidator.predicate(
    "updated_at timestamp is more recent",
    new Date(updatedTodo.updated_at).getTime() >=
      new Date(createdTodo.updated_at).getTime(),
  );
}
