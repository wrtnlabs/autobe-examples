import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieving specific todos by ID when multiple todos exist for the same
 * user.
 *
 * This test validates the UUID-based identification system by creating multiple
 * distinct todos for a single user and verifying that each todo can be
 * retrieved individually by its unique ID without interference from other
 * todos.
 *
 * Test workflow:
 *
 * 1. Register a new user account
 * 2. Create multiple todos with distinct titles
 * 3. Retrieve each todo individually by its unique ID
 * 4. Verify that each retrieval returns the correct todo matching the requested ID
 */
export async function test_api_todo_retrieval_multiple_todos_correct_id(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
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

  // Step 2: Create multiple distinct todos with different titles
  const todoCount = 5;
  const createdTodos = await ArrayUtil.asyncRepeat(todoCount, async (index) => {
    const title = `${RandomGenerator.paragraph({ sentences: 3 })} - Todo ${index + 1}`;

    const todo = await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: title,
      } satisfies ITodoListTodo.ICreate,
    });
    typia.assert(todo);

    return todo;
  });

  // Step 3 & 4: Retrieve each todo by its ID and verify correct data is returned
  await ArrayUtil.asyncForEach(createdTodos, async (expectedTodo) => {
    const retrievedTodo = await api.functional.todoList.user.todos.at(
      connection,
      {
        todoId: expectedTodo.id,
      },
    );
    typia.assert(retrievedTodo);

    // Verify the retrieved todo matches the expected todo
    TestValidator.equals(
      "retrieved todo ID matches expected ID",
      retrievedTodo.id,
      expectedTodo.id,
    );

    TestValidator.equals(
      "retrieved todo title matches expected title",
      retrievedTodo.title,
      expectedTodo.title,
    );

    TestValidator.equals(
      "retrieved todo user ID matches authenticated user",
      retrievedTodo.todo_list_user_id,
      user.id,
    );

    TestValidator.equals(
      "retrieved todo completed status matches expected",
      retrievedTodo.completed,
      expectedTodo.completed,
    );
  });
}
