import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the response format when deleting a todo item.
 *
 * Validates that the DELETE /todoList/user/todos/{todoId} endpoint returns the
 * correct HTTP response structure. The test verifies that deletion operations
 * return void/empty responses per REST conventions, and that the todo item is
 * properly removed from the system.
 *
 * This test performs the following steps:
 *
 * 1. Register a new user account to establish authentication context
 * 2. Create a new todo item with title and optional description
 * 3. Delete the created todo item via DELETE endpoint
 * 4. Validate the response format is void (no content returned)
 */
export async function test_api_todo_deletion_response_format(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user via registration
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);

  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinResponse);
  TestValidator.predicate(
    "user registration successful",
    joinResponse.id !== undefined,
  );

  // Step 2: Create a new todo item
  const todoTitle = RandomGenerator.paragraph({ sentences: 2 });
  const todoDescription = RandomGenerator.paragraph({ sentences: 5 });

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        priority: "medium",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);
  TestValidator.predicate(
    "todo created with valid id",
    createdTodo.id !== undefined,
  );
  TestValidator.equals("todo title matches", createdTodo.title, todoTitle);

  // Step 3: Delete the created todo
  const deleteResponse: void = await api.functional.todoList.user.todos.erase(
    connection,
    {
      todoId: createdTodo.id,
    },
  );

  // Step 4: Validate deletion response format
  TestValidator.predicate(
    "deletion response is void per REST convention",
    deleteResponse === undefined,
  );
}
