import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test todo creation with content at maximum allowed lengths to validate
 * boundary conditions.
 *
 * This test validates that the todo creation endpoint correctly accepts and
 * stores title and description fields at their maximum allowed lengths. The
 * test creates a new user account, authenticates them, and then creates a todo
 * item with a title exactly at the 200-character limit and a description
 * exactly at the 2000-character limit.
 *
 * The test verifies that the system accepts these boundary values without
 * truncation or errors, properly stores the complete content, and returns the
 * todo object with all data intact. This ensures that the length validation
 * boundaries are correctly implemented and users can utilize the full capacity
 * of these fields.
 *
 * Steps:
 *
 * 1. Create a new user account via registration
 * 2. Verify the user is authenticated
 * 3. Generate a title at exactly 200 characters (maximum allowed)
 * 4. Generate a description at exactly 2000 characters (maximum allowed)
 * 5. Create a todo item with maximum length title and description
 * 6. Verify the todo was created successfully
 * 7. Validate that title and description match the original values (no truncation)
 */
export async function test_api_todo_creation_with_maximum_length_content(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account via registration
  const userRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.IRegister;

  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userRegistration,
    });

  // Step 2: Verify the user is authenticated
  typia.assert(authorizedUser);

  // Step 3: Generate a title at exactly 200 characters (maximum allowed)
  const maxTitleLength = 200;
  const maxTitle = RandomGenerator.alphabets(maxTitleLength);
  TestValidator.equals(
    "title length should be exactly 200",
    maxTitle.length,
    maxTitleLength,
  );

  // Step 4: Generate a description at exactly 2000 characters (maximum allowed)
  const maxDescriptionLength = 2000;
  const maxDescription = RandomGenerator.alphabets(maxDescriptionLength);
  TestValidator.equals(
    "description length should be exactly 2000",
    maxDescription.length,
    maxDescriptionLength,
  );

  // Step 5: Create a todo item with maximum length title and description
  const todoCreateRequest = {
    title: maxTitle,
    description: maxDescription,
    status: "incomplete" as const,
  } satisfies ITodoListTodo.ICreate;

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: todoCreateRequest,
    });

  // Step 6: Verify the todo was created successfully
  typia.assert(createdTodo);

  // Step 7: Validate that title and description match the original values (no truncation)
  TestValidator.equals(
    "created todo title should match input",
    createdTodo.title,
    maxTitle,
  );
  TestValidator.equals(
    "created todo description should match input",
    createdTodo.description,
    maxDescription,
  );
  TestValidator.equals(
    "todo should belong to authenticated user",
    createdTodo.todo_list_user_id,
    authorizedUser.id,
  );
}
