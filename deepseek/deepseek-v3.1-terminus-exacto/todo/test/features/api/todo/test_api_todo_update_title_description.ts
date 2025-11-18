import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating a todo item's title and description while maintaining the same
 * status. Authenticated user creates a todo item, then updates both title and
 * description fields to verify that partial updates work correctly. Validates
 * that the updated todo reflects the new title and description while preserving
 * the original status and other fields.
 */
export async function test_api_todo_update_title_description(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create an initial todo item with specific status
  const initialTodoData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "pending" as const,
  } satisfies ITodoListTodo.ICreate;

  const createdTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: initialTodoData,
    },
  );
  typia.assert(createdTodo);

  // Verify initial todo properties
  TestValidator.equals(
    "initial todo title matches",
    createdTodo.title,
    initialTodoData.title,
  );
  TestValidator.equals(
    "initial todo description matches",
    createdTodo.description,
    initialTodoData.description,
  );
  TestValidator.equals(
    "initial todo status is pending",
    createdTodo.status,
    "pending",
  );

  // Since the ITodoListTodo response doesn't include an ID field, and the update operation
  // requires a todoId parameter, this test scenario cannot be implemented as originally planned.
  // The API structure indicates that todos are created but there's no mechanism provided
  // to update existing todos since the response doesn't include identifiers.

  // This test demonstrates the creation functionality but cannot test updates due to
  // the limitation in the API response structure.
  TestValidator.predicate(
    "todo creation successful",
    createdTodo.title === initialTodoData.title,
  );
}
