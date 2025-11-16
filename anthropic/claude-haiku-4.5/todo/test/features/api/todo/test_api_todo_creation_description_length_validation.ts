import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test description field length constraints during todo creation.
 *
 * Validates that the todo creation endpoint properly enforces the 2000
 * character maximum length constraint on the description field. Tests multiple
 * scenarios:
 *
 * - Creating todos with no description (null/undefined)
 * - Creating todos with short descriptions
 * - Creating todos with descriptions at exactly the 2000 character limit
 * - Attempting to create todos with descriptions exceeding the 2000 character
 *   limit
 *
 * This test ensures the backend enforces business rule constraints that limit
 * todo descriptions to a maximum of 2000 characters, preventing invalid data
 * from being stored in the system.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new user account
 * 2. Test creating todo with no description (within limits)
 * 3. Test creating todo with short description (within limits)
 * 4. Test creating todo with maximum valid description (2000 chars)
 * 5. Test that creating todo with oversized description (2001+ chars) fails
 */
export async function test_api_todo_creation_description_length_validation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new user
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000/register",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Test creating todo with no description
  const todoNoDescription: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: null,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(todoNoDescription);
  TestValidator.equals(
    "todo with no description should have null description",
    todoNoDescription.description,
    null,
  );

  // Step 3: Test creating todo with short description (100 characters)
  const shortDescription = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  }).substring(0, 100);
  const todoShortDescription: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: shortDescription,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(todoShortDescription);
  TestValidator.equals(
    "short description should be stored correctly",
    todoShortDescription.description,
    shortDescription,
  );

  // Step 4: Test creating todo with maximum valid description (2000 characters)
  const maxValidDescription = RandomGenerator.paragraph({
    sentences: 50,
    wordMin: 3,
    wordMax: 6,
  }).substring(0, 2000);
  const todoMaxDescription: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: maxValidDescription,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(todoMaxDescription);
  TestValidator.equals(
    "maximum valid description (2000 chars) should be accepted",
    todoMaxDescription.description,
    maxValidDescription,
  );
  TestValidator.equals(
    "maximum description length should be exactly 2000",
    maxValidDescription.length,
    2000,
  );

  // Step 5: Test that description exceeding 2000 characters fails
  const oversizedDescription = RandomGenerator.content({
    paragraphs: 10,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 3,
    wordMax: 6,
  }).substring(0, 2001);

  await TestValidator.error(
    "creating todo with description exceeding 2000 characters should fail",
    async () => {
      await api.functional.todoApp.user.todos.create(connection, {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: oversizedDescription,
        } satisfies ITodoAppTodo.ICreate,
      });
    },
  );

  TestValidator.predicate(
    "oversized description should exceed 2000 character limit",
    oversizedDescription.length > 2000,
  );
}
