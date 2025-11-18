import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the complete workflow of an authenticated user creating a new todo item.
 *
 * This test validates that a user can successfully register, authenticate, and
 * create a todo with all required fields populated correctly. It verifies
 * proper user ownership, automatic field generation (id, timestamps), and
 * correct default values (completed=false, completed_at=null,
 * deleted_at=null).
 *
 * Workflow:
 *
 * 1. Register a new user account (establishes authenticated session)
 * 2. Create a new todo item with a valid title
 * 3. Validate the complete todo entity structure
 * 4. Verify user isolation and ownership
 */
export async function test_api_todo_creation_by_authenticated_user(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  // This automatically establishes an authenticated session with JWT tokens
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registeredUser);

  // Validate user registration succeeded
  TestValidator.predicate(
    "user registration successful with valid email",
    registeredUser.email === userEmail,
  );

  // Step 2: Create a new todo item
  // The user is already authenticated from the join operation
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: todoTitle,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 3: Validate business logic and data relationships

  // Validate user ownership
  TestValidator.equals(
    "todo is owned by the authenticated user",
    createdTodo.todo_list_user_id,
    registeredUser.id,
  );

  // Validate title matches input
  TestValidator.equals(
    "todo title matches input",
    createdTodo.title,
    todoTitle,
  );

  // Validate completed status defaults to false
  TestValidator.equals(
    "todo completed status defaults to false",
    createdTodo.completed,
    false,
  );

  // Validate completed_at is null for new todos
  TestValidator.equals(
    "completed_at is null for new todos",
    createdTodo.completed_at,
    null,
  );

  // Validate deleted_at is null for active todos
  TestValidator.equals(
    "deleted_at is null for active todos",
    createdTodo.deleted_at,
    null,
  );

  // Validate created_at and updated_at are the same for new todos
  TestValidator.equals(
    "created_at and updated_at are the same for new todos",
    createdTodo.created_at,
    createdTodo.updated_at,
  );
}
