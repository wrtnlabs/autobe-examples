import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that a single authenticated user can create multiple todo items
 * successfully.
 *
 * This test validates the core functionality of creating multiple independent
 * todo items for a single user account. It ensures that:
 *
 * 1. A user can create multiple todos without conflicts
 * 2. Each todo receives a unique identifier
 * 3. All todos are properly associated with the same user_id
 * 4. Each todo maintains its complete metadata independently
 * 5. There are no limitations on the number of todos a user can create
 *
 * Test workflow:
 *
 * 1. Register and authenticate a new user
 * 2. Create multiple todo items (3-5) with different titles
 * 3. Verify each todo creation returns a complete todo object
 * 4. Validate unique IDs for all created todos
 * 5. Confirm all todos share the same user_id
 * 6. Check that each todo has proper metadata (timestamps, completion status)
 */
export async function test_api_todo_creation_multiple_todos_same_user(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();
  const currentUrl = typia.random<string & tags.Format<"uri">>();
  const referrerUrl = typia.random<string & tags.Format<"uri">>();

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: currentUrl,
      referrer: referrerUrl,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Verify user authentication was successful
  TestValidator.predicate("user should have valid id", user.id.length > 0);
  TestValidator.equals("user email matches", user.email, userEmail);
  TestValidator.predicate(
    "user should have access token",
    user.token.access.length > 0,
  );

  // Step 2: Create multiple todo items with different titles
  const numberOfTodos = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<5>
  >();
  const createdTodos: ITodoListTodo[] = [];

  for (let i = 0; i < numberOfTodos; i++) {
    const todoTitle = `${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 })} - Task ${i + 1}`;

    const todo = await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: todoTitle,
      } satisfies ITodoListTodo.ICreate,
    });
    typia.assert(todo);

    createdTodos.push(todo);
  }

  // Step 3: Verify correct number of todos were created
  TestValidator.equals(
    "created todos count",
    createdTodos.length,
    numberOfTodos,
  );

  // Step 4: Validate each todo has unique ID and proper structure
  const todoIds = new Set<string>();

  for (let i = 0; i < createdTodos.length; i++) {
    const todo = createdTodos[i];

    // Verify unique ID
    TestValidator.predicate(
      `todo ${i + 1} has unique id`,
      !todoIds.has(todo.id),
    );
    todoIds.add(todo.id);

    // Verify user association
    TestValidator.equals(
      `todo ${i + 1} belongs to user`,
      todo.todo_list_user_id,
      user.id,
    );

    // Verify initial state
    TestValidator.equals(
      `todo ${i + 1} is not completed initially`,
      todo.completed,
      false,
    );
    TestValidator.equals(
      `todo ${i + 1} has no completion timestamp`,
      todo.completed_at,
      null,
    );

    // Verify title is set correctly
    TestValidator.predicate(
      `todo ${i + 1} has non-empty title`,
      todo.title.length > 0,
    );

    // Verify metadata fields exist
    TestValidator.predicate(
      `todo ${i + 1} has created_at timestamp`,
      todo.created_at.length > 0,
    );
    TestValidator.predicate(
      `todo ${i + 1} has updated_at timestamp`,
      todo.updated_at.length > 0,
    );

    // Verify not deleted
    TestValidator.equals(`todo ${i + 1} is not deleted`, todo.deleted_at, null);
  }

  // Step 5: Verify all IDs are unique (set size equals array length)
  TestValidator.equals(
    "all todo IDs are unique",
    todoIds.size,
    createdTodos.length,
  );

  // Step 6: Verify all todos belong to the same user
  const allBelongToSameUser = createdTodos.every(
    (todo) => todo.todo_list_user_id === user.id,
  );
  TestValidator.predicate("all todos belong to same user", allBelongToSameUser);
}
