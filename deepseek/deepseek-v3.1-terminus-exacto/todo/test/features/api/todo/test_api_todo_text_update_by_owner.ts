import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful todo text content update by the todo owner.
 *
 * This test validates that authenticated users can update their todo items'
 * text content while preserving other properties and updating modification
 * timestamps appropriately. The workflow includes user registration, todo
 * creation, text update, and comprehensive validation of the updated todo.
 */
export async function test_api_todo_text_update_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "password123";
  const userName = RandomGenerator.name();

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

  // Step 2: Create an initial todo item
  const initialTodoText = RandomGenerator.paragraph({ sentences: 3 });
  const initialTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        text: initialTodoText,
        completed: false,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(initialTodo);

  // Verify initial todo properties
  TestValidator.equals(
    "initial todo text matches",
    initialTodo.text,
    initialTodoText,
  );
  TestValidator.equals(
    "initial todo completed is false",
    initialTodo.completed,
    false,
  );
  TestValidator.predicate(
    "initial todo has valid ID",
    initialTodo.id.length > 0,
  );
  TestValidator.predicate(
    "initial todo has creation timestamp",
    initialTodo.created_at.length > 0,
  );
  TestValidator.predicate(
    "initial todo has update timestamp",
    initialTodo.updated_at.length > 0,
  );

  // Step 3: Update the todo text content
  const updatedTodoText = RandomGenerator.paragraph({ sentences: 5 });
  const updatedTodo = await api.functional.todoApp.user.todos.update(
    connection,
    {
      todoId: initialTodo.id,
      body: {
        text: updatedTodoText,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);

  // Step 4: Validate the updated todo
  TestValidator.equals(
    "todo ID remains unchanged",
    updatedTodo.id,
    initialTodo.id,
  );
  TestValidator.equals(
    "text content is updated",
    updatedTodo.text,
    updatedTodoText,
  );
  TestValidator.equals(
    "completed status remains unchanged",
    updatedTodo.completed,
    initialTodo.completed,
  );
  TestValidator.equals(
    "creation timestamp remains unchanged",
    updatedTodo.created_at,
    initialTodo.created_at,
  );
  TestValidator.notEquals(
    "update timestamp is changed",
    updatedTodo.updated_at,
    initialTodo.updated_at,
  );
  TestValidator.equals(
    "deleted_at remains undefined",
    updatedTodo.deleted_at,
    undefined,
  );

  // Additional validation: Ensure no other properties were modified
  TestValidator.predicate(
    "updated todo has valid structure",
    updatedTodo.id === initialTodo.id &&
      updatedTodo.text === updatedTodoText &&
      updatedTodo.completed === initialTodo.completed &&
      updatedTodo.created_at === initialTodo.created_at &&
      updatedTodo.updated_at !== initialTodo.updated_at,
  );
}
