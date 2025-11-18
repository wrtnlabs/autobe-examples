import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test creation of a detailed todo item with title and optional description.
 * Validates that users can provide additional context for complex tasks while
 * maintaining proper field length constraints and status assignment.
 */
export async function test_api_todo_creation_with_description(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create todo with detailed description
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const todoDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 12,
  });

  const todo = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: todoTitle,
      description: todoDescription,
      status: "pending",
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo);

  // Step 3: Validate created todo matches input
  TestValidator.equals("todo title matches input", todo.title, todoTitle);
  TestValidator.equals(
    "todo description matches input",
    todo.description,
    todoDescription,
  );
  TestValidator.equals("todo status is pending", todo.status, "pending");

  // Step 4: Create another todo without description to test optional field
  const simpleTodoTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 2,
    wordMax: 6,
  });

  const simpleTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: simpleTodoTitle,
        // description intentionally omitted to test optional field
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(simpleTodo);

  // Step 5: Validate simple todo (without description)
  TestValidator.equals(
    "simple todo title matches",
    simpleTodo.title,
    simpleTodoTitle,
  );
  TestValidator.equals(
    "simple todo has no description",
    simpleTodo.description,
    undefined,
  );
  TestValidator.equals(
    "simple todo status defaults to pending",
    simpleTodo.status,
    "pending",
  );

  // Step 6: Create todo with completed status
  const completedTodoTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 7,
  });

  const completedTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: completedTodoTitle,
        description: "This task is already completed",
        status: "completed",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(completedTodo);

  // Step 7: Validate completed todo
  TestValidator.equals(
    "completed todo title matches",
    completedTodo.title,
    completedTodoTitle,
  );
  TestValidator.equals(
    "completed todo has description",
    completedTodo.description,
    "This task is already completed",
  );
  TestValidator.equals(
    "completed todo status is completed",
    completedTodo.status,
    "completed",
  );

  // Step 8: Test field length constraints by creating todos with various lengths
  const shortTitleTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "A", // Minimum length title
        description: "Short title test",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(shortTitleTodo);

  const longDescriptionTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Test with long description",
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 20,
          sentenceMax: 30,
        }),
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(longDescriptionTodo);
}
