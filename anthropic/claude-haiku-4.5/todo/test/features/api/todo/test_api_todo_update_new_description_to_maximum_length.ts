import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test updating a todo's description to the maximum allowed length.
 *
 * This test validates that the system correctly handles the upper boundary
 * constraint for todo descriptions. A user creates a todo item and then updates
 * its description to the maximum allowed length of 2000 characters. The test
 * verifies that:
 *
 * 1. The system accepts a description with exactly 2000 characters
 * 2. The complete description is stored without any truncation
 * 3. The updated todo reflects the maximum-length description accurately
 * 4. The upper boundary constraint is properly enforced
 *
 * Process:
 *
 * 1. Create a user account through authentication
 * 2. Create a new todo item with initial data
 * 3. Generate a description string with exactly 2000 characters
 * 4. Update the todo's description to the maximum length
 * 5. Verify the returned todo contains the complete 2000-character description
 * 6. Confirm the description was stored without truncation
 */
export async function test_api_todo_update_new_description_to_maximum_length(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000/auth",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a new todo item with initial description
  const initialTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Test Todo for Maximum Description",
        description: "Initial description",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(initialTodo);
  TestValidator.equals(
    "initial todo title matches",
    initialTodo.title,
    "Test Todo for Maximum Description",
  );

  // Step 3: Generate a 2000-character description (maximum allowed length)
  const maxLengthDescription = RandomGenerator.content({
    paragraphs: 10,
    sentenceMin: 20,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  }).substring(0, 2000);

  // Verify the description is exactly 2000 characters
  TestValidator.predicate(
    "generated description is exactly 2000 characters",
    maxLengthDescription.length === 2000,
  );

  // Step 4: Update the todo's description to maximum length
  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: initialTodo.id,
      body: {
        description: maxLengthDescription,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo);

  // Step 5: Verify the updated todo contains the complete 2000-character description
  TestValidator.equals(
    "updated todo description matches input with maximum length",
    updatedTodo.description,
    maxLengthDescription,
  );

  // Step 6: Confirm description length is exactly 2000 characters
  if (
    updatedTodo.description !== null &&
    updatedTodo.description !== undefined
  ) {
    TestValidator.equals(
      "description length is exactly 2000 characters",
      updatedTodo.description.length,
      2000,
    );
  }

  // Verify other todo properties remain unchanged
  TestValidator.equals(
    "todo title unchanged after description update",
    updatedTodo.title,
    initialTodo.title,
  );

  TestValidator.equals(
    "todo id unchanged after update",
    updatedTodo.id,
    initialTodo.id,
  );
}
