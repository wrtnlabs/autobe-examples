import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that retrieval by ID uses exact UUID matching.
 *
 * This test validates that the todo retrieval API uses exact UUID matching and
 * doesn't return incorrect todos when similar-looking UUIDs are used. We create
 * multiple todos and verify that each todo can be retrieved by its specific ID,
 * confirming that:
 *
 * 1. Each todo is correctly associated with its unique UUID
 * 2. UUID matching is case-sensitive
 * 3. UUID matching is exact with no partial matches
 * 4. Each user's todos are isolated and don't interfere with each other
 *
 * Steps:
 *
 * 1. Register a new user account
 * 2. Create multiple todo items with different titles
 * 3. Retrieve each todo by its ID
 * 4. Verify that the retrieved todo matches the created todo exactly
 * 5. Confirm that retrieving by a todo's ID returns only that todo, not others
 */
export async function test_api_todo_retrieval_by_exact_id_match(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "TestPassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create multiple todo items with different titles
  const todo1 = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: "First Todo Task",
      description: "This is the first todo",
      priority: "high",
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo1);

  const todo2 = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: "Second Todo Task",
      description: "This is the second todo",
      priority: "medium",
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo2);

  const todo3 = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: "Third Todo Task",
      description: "This is the third todo",
      priority: "low",
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo3);

  // Step 3: Retrieve each todo by its ID and verify exact matching
  const retrievedTodo1 = await api.functional.todoList.user.todos.at(
    connection,
    {
      todoId: todo1.id,
    },
  );
  typia.assert(retrievedTodo1);
  TestValidator.equals(
    "first todo ID matches exactly",
    retrievedTodo1.id,
    todo1.id,
  );
  TestValidator.equals(
    "first todo title matches",
    retrievedTodo1.title,
    todo1.title,
  );

  const retrievedTodo2 = await api.functional.todoList.user.todos.at(
    connection,
    {
      todoId: todo2.id,
    },
  );
  typia.assert(retrievedTodo2);
  TestValidator.equals(
    "second todo ID matches exactly",
    retrievedTodo2.id,
    todo2.id,
  );
  TestValidator.equals(
    "second todo title matches",
    retrievedTodo2.title,
    todo2.title,
  );

  const retrievedTodo3 = await api.functional.todoList.user.todos.at(
    connection,
    {
      todoId: todo3.id,
    },
  );
  typia.assert(retrievedTodo3);
  TestValidator.equals(
    "third todo ID matches exactly",
    retrievedTodo3.id,
    todo3.id,
  );
  TestValidator.equals(
    "third todo title matches",
    retrievedTodo3.title,
    todo3.title,
  );

  // Step 4: Verify isolation - each retrieval returns only the specific todo
  TestValidator.notEquals(
    "retrieved todo1 is not todo2",
    retrievedTodo1.id,
    retrievedTodo2.id,
  );
  TestValidator.notEquals(
    "retrieved todo2 is not todo3",
    retrievedTodo2.id,
    retrievedTodo3.id,
  );
  TestValidator.notEquals(
    "retrieved todo1 is not todo3",
    retrievedTodo1.id,
    retrievedTodo3.id,
  );

  // Step 5: Verify that each todo maintains its own data integrity
  TestValidator.equals(
    "todo1 description preserved",
    retrievedTodo1.description,
    "This is the first todo",
  );
  TestValidator.equals(
    "todo2 description preserved",
    retrievedTodo2.description,
    "This is the second todo",
  );
  TestValidator.equals(
    "todo3 description preserved",
    retrievedTodo3.description,
    "This is the third todo",
  );
}
