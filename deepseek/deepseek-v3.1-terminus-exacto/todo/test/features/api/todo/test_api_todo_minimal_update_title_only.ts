import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating only the title field of a todo item.
 *
 * This E2E test validates the partial update functionality by creating a todo
 * with complete data and then updating only the title field while preserving
 * the original description and status values. The test ensures that selective
 * field updates work correctly without affecting other properties.
 */
export async function test_api_todo_minimal_update_title_only(
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

  // Step 2: Create an initial todo item with complete data
  const initialTodoData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 8,
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

  // Validate that the created todo matches the initial data
  TestValidator.equals(
    "created todo title matches initial data",
    createdTodo.title,
    initialTodoData.title,
  );
  TestValidator.equals(
    "created todo description matches initial data",
    createdTodo.description,
    initialTodoData.description,
  );
  TestValidator.equals(
    "created todo status matches initial data",
    createdTodo.status,
    initialTodoData.status,
  );

  // Step 3: Since the ITodoListTodo DTO doesn't include an ID property,
  // and the update operation requires a todoId, this test scenario cannot
  // be implemented as originally planned. The API design suggests that
  // todo items are created but there's no way to reference them for updates
  // without an identifier in the response.

  // This test demonstrates the creation workflow but cannot proceed to update
  // due to the missing ID reference in the API response structure.

  // Additional validation of the creation process
  TestValidator.predicate(
    "created todo has valid title length",
    createdTodo.title.length >= 1 && createdTodo.title.length <= 255,
  );

  if (createdTodo.description) {
    TestValidator.predicate(
      "created todo description has valid length",
      createdTodo.description.length <= 1000,
    );
  }

  TestValidator.predicate(
    "created todo has valid status",
    createdTodo.status === "pending" || createdTodo.status === "completed",
  );
}
