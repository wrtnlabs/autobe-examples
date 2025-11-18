import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test todo creation with a title at the maximum allowed length of 500
 * characters.
 *
 * This test validates that the system correctly accepts and stores todo titles
 * up to the maximum length constraint of 500 characters as defined in the
 * schema. It verifies that the full title is preserved without truncation and
 * that all other fields are populated correctly.
 *
 * Test workflow:
 *
 * 1. Authenticate a user to enable todo creation
 * 2. Generate a title string of exactly 500 characters
 * 3. Create a todo item with the maximum-length title
 * 4. Verify successful creation without errors
 * 5. Validate that the full 500-character title is preserved
 * 6. Confirm all other todo fields are correctly populated
 */
export async function test_api_todo_creation_with_maximum_length_title(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user to obtain valid credentials
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();
  const currentHref = typia.random<string & tags.Format<"uri">>();
  const currentReferrer = typia.random<string & tags.Format<"uri">>();

  const authenticatedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: currentHref,
        referrer: currentReferrer,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(authenticatedUser);

  // Step 2: Generate a title string of exactly 500 characters (maximum allowed)
  const maxTitleLength = 500;
  const maximumLengthTitle = RandomGenerator.alphabets(maxTitleLength);

  // Verify the generated title is exactly 500 characters
  TestValidator.equals(
    "generated title length should be exactly 500",
    maximumLengthTitle.length,
    maxTitleLength,
  );

  // Step 3: Create a todo item with the maximum-length title
  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: maximumLengthTitle,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 4: Verify successful creation - validate the returned todo structure
  TestValidator.predicate(
    "todo id should be a valid UUID",
    createdTodo.id.length > 0,
  );

  TestValidator.equals(
    "todo should belong to authenticated user",
    createdTodo.todo_list_user_id,
    authenticatedUser.id,
  );

  // Step 5: Validate that the full 500-character title is preserved without truncation
  TestValidator.equals(
    "todo title should match the maximum-length input exactly",
    createdTodo.title,
    maximumLengthTitle,
  );

  TestValidator.equals(
    "preserved title length should be exactly 500 characters",
    createdTodo.title.length,
    maxTitleLength,
  );

  // Step 6: Confirm all other todo fields are correctly populated
  TestValidator.equals(
    "new todo should not be completed by default",
    createdTodo.completed,
    false,
  );

  TestValidator.equals(
    "completed_at should be null for incomplete todo",
    createdTodo.completed_at,
    null,
  );

  TestValidator.predicate(
    "created_at timestamp should be set",
    createdTodo.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at timestamp should be set",
    createdTodo.updated_at.length > 0,
  );

  TestValidator.equals(
    "deleted_at should be null for active todo",
    createdTodo.deleted_at,
    null,
  );
}
