import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test title length validation constraints during todo creation.
 *
 * Validates enforcement of the business rule requiring todo titles to be
 * between 1-255 characters. The test verifies:
 *
 * 1. Valid titles (1-255 characters) are accepted and todos are created
 *    successfully
 * 2. Empty titles (0 characters) are rejected with validation errors
 * 3. Excessively long titles (256+ characters) are rejected with validation errors
 *
 * This ensures the API properly enforces the title length constraints specified
 * in the ITodoAppTodo.ICreate DTO, validating both minimum and maximum length
 * boundaries and their edge cases.
 */
export async function test_api_todo_creation_title_length_validation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new user account
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Test valid title with minimum length (1 character)
  const minValidTitle = "T";
  const todoMinLength: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: minValidTitle,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(todoMinLength);
  TestValidator.equals(
    "minimum length title created successfully",
    todoMinLength.title,
    minValidTitle,
  );

  // Step 3: Test valid title with maximum length (255 characters)
  const maxValidTitle = RandomGenerator.alphabets(255);
  const todoMaxLength: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: maxValidTitle,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(todoMaxLength);
  TestValidator.equals(
    "maximum length title created successfully",
    todoMaxLength.title,
    maxValidTitle,
  );

  // Step 4: Test valid title with mid-range length (100 characters)
  const midRangeTitle = RandomGenerator.alphabets(100);
  const todoMidRange: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: midRangeTitle,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(todoMidRange);
  TestValidator.equals(
    "mid-range length title created successfully",
    todoMidRange.title,
    midRangeTitle,
  );

  // Step 5: Test invalid empty title (0 characters) - should fail
  await TestValidator.error("empty title should be rejected", async () => {
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: "",
      } satisfies ITodoAppTodo.ICreate,
    });
  });

  // Step 6: Test invalid title exceeding maximum length (256 characters) - should fail
  const oversizedTitle = RandomGenerator.alphabets(256);
  await TestValidator.error("oversized title should be rejected", async () => {
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: oversizedTitle,
      } satisfies ITodoAppTodo.ICreate,
    });
  });

  // Step 7: Test invalid title with even longer content (500 characters) - should fail
  const veryLongTitle = RandomGenerator.alphabets(500);
  await TestValidator.error("very long title should be rejected", async () => {
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: veryLongTitle,
      } satisfies ITodoAppTodo.ICreate,
    });
  });

  // Step 8: Verify valid todo with title and description
  const validTitleWithDescription = RandomGenerator.paragraph({ sentences: 5 });
  const todoWithDescription: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: validTitleWithDescription,
        description: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(todoWithDescription);
  TestValidator.equals(
    "valid title with description created successfully",
    todoWithDescription.title,
    validTitleWithDescription,
  );
  TestValidator.predicate(
    "description is properly stored",
    todoWithDescription.description !== null &&
      todoWithDescription.description !== undefined,
  );
}
