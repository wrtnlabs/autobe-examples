import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test creating a todo item with maximum length title and description.
 *
 * This test validates that the todo creation API correctly handles edge cases
 * where the title is at its maximum allowed length of 200 characters and the
 * description is at its maximum allowed length of 2000 characters.
 *
 * The test ensures:
 *
 * 1. User authentication is properly established
 * 2. Maximum-length title (200 characters) is accepted and stored completely
 * 3. Maximum-length description (2000 characters) is accepted and stored
 *    completely
 * 4. No data truncation occurs at the boundary limits
 * 5. All other todo properties are correctly initialized
 *
 * This validates proper length constraint handling at the upper bounds of the
 * defined schema limits.
 */
export async function test_api_todo_creation_long_title_and_description(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";
  const currentPageUrl = typia.random<string & tags.Format<"uri">>();
  const referrerUrl = typia.random<string & tags.Format<"uri">>();

  const authenticatedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: currentPageUrl,
        referrer: referrerUrl,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(authenticatedUser);

  // Step 2: Generate a title string exactly 200 characters long (maximum allowed)
  const maxTitleLength = 200;
  const longTitle = RandomGenerator.alphabets(maxTitleLength);

  TestValidator.equals(
    "title length should be exactly 200 characters",
    longTitle.length,
    maxTitleLength,
  );

  // Step 3: Generate a description string exactly 2000 characters long (maximum allowed)
  const maxDescriptionLength = 2000;
  const longDescription = RandomGenerator.alphabets(maxDescriptionLength);

  TestValidator.equals(
    "description length should be exactly 2000 characters",
    longDescription.length,
    maxDescriptionLength,
  );

  // Step 4: Create a todo item with the maximum-length title and description
  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: longTitle,
        description: longDescription,
        status: "pending",
        priority: "medium",
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 5: Verify the created todo item preserves the full title and description
  TestValidator.equals(
    "created todo title should match the input title exactly",
    createdTodo.title,
    longTitle,
  );

  // Verify description is not null before checking length
  TestValidator.predicate(
    "created todo description should not be null",
    createdTodo.description !== null && createdTodo.description !== undefined,
  );

  TestValidator.equals(
    "created todo description should match the input description exactly",
    createdTodo.description,
    longDescription,
  );

  TestValidator.equals(
    "created todo title length should be 200 characters",
    createdTodo.title.length,
    maxTitleLength,
  );

  TestValidator.equals(
    "created todo description length should be 2000 characters",
    createdTodo.description!.length,
    maxDescriptionLength,
  );

  // Step 6: Validate all other todo properties are correctly set
  TestValidator.equals(
    "todo status should be pending",
    createdTodo.status,
    "pending",
  );

  TestValidator.equals(
    "todo priority should be medium",
    createdTodo.priority,
    "medium",
  );

  TestValidator.equals(
    "todo completed flag should be false",
    createdTodo.completed,
    false,
  );
}
