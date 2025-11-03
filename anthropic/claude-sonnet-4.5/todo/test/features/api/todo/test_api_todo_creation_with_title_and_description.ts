import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the complete user workflow for creating a new todo item with both
 * required title and optional description.
 *
 * This test validates that authenticated users can successfully create todo
 * items to track their tasks and responsibilities. The test creates a new user
 * account, authenticates them, and then creates a todo item with a meaningful
 * title (within 1-200 character limit) and a detailed description (within 2000
 * character limit).
 *
 * The test verifies that the system correctly:
 *
 * 1. Creates a new user account and establishes authentication
 * 2. Accepts todo creation with valid title and description
 * 3. Assigns the todo to the authenticated user
 * 4. Sets initial completion status to 'incomplete'
 * 5. Automatically generates timestamps (created_at, updated_at)
 * 6. Sets deleted_at to null for active todos
 * 7. Returns the complete todo object with system-generated unique identifier
 *
 * This validates the core todo creation functionality and proper enforcement of
 * validation rules.
 */
export async function test_api_todo_creation_with_title_and_description(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.IRegister,
    });
  typia.assert(registeredUser);

  // Verify user registration returned expected structure
  TestValidator.equals("user email matches", registeredUser.email, userEmail);

  // Step 2: Create a todo item with title and description
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const todoDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 3: Verify the created todo has all expected properties
  TestValidator.equals(
    "todo title matches input",
    createdTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "todo description matches input",
    createdTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "todo status is incomplete",
    createdTodo.status,
    "incomplete",
  );
  TestValidator.equals(
    "todo is assigned to authenticated user",
    createdTodo.todo_list_user_id,
    registeredUser.id,
  );
}
