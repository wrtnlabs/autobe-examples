import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test creation of multiple todo items by the same user to validate proper
 * isolation and individual item management.
 *
 * This test validates that the system correctly handles multiple todo creation
 * operations within the same user context, ensuring each todo receives unique
 * identifiers and maintains independent state. The test follows a complete
 * workflow: user authentication, followed by creation of multiple todos with
 * different text content and completion statuses, then verification of proper
 * isolation and individual management capabilities.
 */
export async function test_api_todo_creation_multiple_items(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user session
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";
  const userName = RandomGenerator.paragraph({ sentences: 2 });

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: userName,
      href: "https://example.com/todo-app",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create multiple todo items with diverse content
  const todoCount = 5;
  const todos: ITodoAppTodo[] = [];

  for (let i = 0; i < todoCount; i++) {
    const todoText = RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    });

    const completed = i % 2 === 0; // Alternate completion status

    const todo = await api.functional.todoApp.user.todos.create(connection, {
      body: {
        text: todoText,
        completed: completed,
      } satisfies ITodoAppTodo.ICreate,
    });
    typia.assert(todo);
    todos.push(todo);

    // Validate individual todo properties
    TestValidator.equals("todo text matches input", todo.text, todoText);
    TestValidator.equals(
      "todo completion status matches input",
      todo.completed,
      completed,
    );
  }

  // Step 3: Validate proper isolation and uniqueness
  TestValidator.equals(
    "correct number of todos created",
    todos.length,
    todoCount,
  );

  // Verify all todos have unique IDs
  const todoIds = todos.map((todo) => todo.id);
  const uniqueIds = new Set(todoIds);
  TestValidator.equals("all todo IDs are unique", uniqueIds.size, todoCount);

  // Verify todos maintain independent content
  for (let i = 0; i < todos.length; i++) {
    for (let j = i + 1; j < todos.length; j++) {
      TestValidator.notEquals(
        "todo texts are different",
        todos[i].text,
        todos[j].text,
      );
    }
  }

  // Verify completion status distribution
  const completedTodos = todos.filter((todo) => todo.completed);
  const incompleteTodos = todos.filter((todo) => !todo.completed);

  TestValidator.predicate(
    "has both completed and incomplete todos",
    completedTodos.length > 0 && incompleteTodos.length > 0,
  );

  // Verify timestamps are properly set and unique
  const createdTimestamps = todos.map((todo) => todo.created_at);
  const uniqueTimestamps = new Set(createdTimestamps);
  TestValidator.predicate(
    "created timestamps are unique",
    uniqueTimestamps.size === todoCount,
  );

  console.log(
    `✅ Successfully created ${todoCount} todos with proper isolation`,
  );
}
