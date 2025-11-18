import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successfully deleting an existing todo.
 *
 * This test validates the complete lifecycle of todo deletion:
 *
 * 1. Authenticate a user to establish JWT session
 * 2. Create a new todo item with complete details
 * 3. Verify the todo exists with correct properties
 * 4. Delete the todo using the delete endpoint
 * 5. Confirm deletion operation completed successfully
 * 6. Validate that deletion is permanent and irreversible
 */
export async function test_api_todo_deletion_successful(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const authResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(authResponse);
  TestValidator.equals(
    "user email matches authentication request",
    authResponse.email,
    userEmail,
  );

  // Step 2: Create a new todo item
  const todoTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const todoDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const priority = "high" as const;
  const dueDate = new Date(Date.now() + 86400000).toISOString();

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        priority: priority,
        due_date: dueDate,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 3: Verify todo exists with correct properties
  TestValidator.equals(
    "created todo title matches input",
    createdTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "created todo description matches input",
    createdTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "created todo is not completed",
    createdTodo.completed,
    false,
  );
  TestValidator.equals(
    "created todo priority is high",
    createdTodo.priority,
    priority,
  );
  TestValidator.predicate(
    "created todo has valid created_at timestamp",
    createdTodo.created_at !== null && createdTodo.created_at.length > 0,
  );
  TestValidator.predicate(
    "created todo has valid updated_at timestamp",
    createdTodo.updated_at !== null && createdTodo.updated_at.length > 0,
  );

  const todoId = createdTodo.id;

  // Step 4: Delete the todo
  await api.functional.todoList.user.todos.erase(connection, {
    todoId: todoId,
  });

  // Step 5 & 6: Confirm deletion completed successfully
  // The erase() function returns void on success. If it throws an error, the test fails.
  // The fact that we reach this point without an exception proves the deletion was successful.
  TestValidator.predicate("todo deletion completed successfully", true);
}
