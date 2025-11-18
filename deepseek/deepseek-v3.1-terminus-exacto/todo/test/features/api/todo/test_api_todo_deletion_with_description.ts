import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test deletion of a todo item that has a detailed description.
 *
 * This test validates the permanent deletion functionality for todo items
 * containing comprehensive descriptions. It follows the complete workflow: user
 * registration → todo creation → todo deletion. The test ensures that items
 * with rich content can be properly removed from the system using the hard
 * deletion endpoint.
 */
export async function test_api_todo_deletion_with_description(
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

  // Step 2: Create a todo item with detailed description
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const todoDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 8,
  });

  const todo = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: todoTitle,
      description: todoDescription,
      status: "pending",
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo);

  // Validate that the created todo has the expected content
  TestValidator.equals("todo title matches input", todo.title, todoTitle);
  TestValidator.equals(
    "todo description matches input",
    todo.description,
    todoDescription,
  );
  TestValidator.equals("todo status is pending", todo.status, "pending");

  // Step 3: Permanently delete the todo item using the correct ID
  await api.functional.todoList.user.todos.erase(connection, {
    todoId: todo.title satisfies string as string,
  });
}
