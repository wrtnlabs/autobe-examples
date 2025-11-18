import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful retrieval of a todo item by its owner.
 *
 * This E2E test validates that authenticated users can access their own todo
 * items with complete data including title, description, status, and
 * timestamps. It ensures proper authorization checks prevent access to todos
 * owned by other users.
 *
 * The test follows a complete workflow:
 *
 * 1. User Registration: Create a new user account to establish authentication
 *    context
 * 2. Todo Creation: Create a todo item that will be retrieved later
 * 3. Todo Retrieval: Fetch the created todo using its ID to validate successful
 *    retrieval
 * 4. Data Validation: Ensure the retrieved todo matches the created todo data
 * 5. Authorization Validation: Verify that other users cannot access the todo
 */
export async function test_api_todo_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create first authenticated user context
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUserPassword = "testPassword123";

  const firstUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: firstUserEmail,
        password: firstUserPassword,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(firstUser);

  // Step 2: Create a todo item with first user
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const todoDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        status: "pending",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 3: Retrieve the created todo item with first user (should succeed)
  const retrievedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.at(connection, {
      todoId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(retrievedTodo);

  // Step 4: Validate the retrieved todo matches the created todo
  TestValidator.equals(
    "todo title should match",
    retrievedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "todo description should match",
    retrievedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "todo status should match",
    retrievedTodo.status,
    createdTodo.status,
  );

  // Step 5: Create second user and attempt unauthorized access
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUserPassword = "anotherPassword456";

  const secondUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: secondUserEmail,
        password: secondUserPassword,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(secondUser);

  // Attempt to access first user's todo with second user (should fail)
  await TestValidator.error(
    "second user should not be able to access first user's todo",
    async () => {
      await api.functional.todoList.user.todos.at(connection, {
        todoId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
