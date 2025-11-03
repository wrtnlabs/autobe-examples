import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test the creation of a new todo user account.
 *
 * This test function verifies the successful creation of a todo user through
 * the /todo/todoUsers POST endpoint. It covers the following aspects:
 *
 * 1. Generate a unique email address using typia and RandomGenerator to ensure no
 *    duplication.
 * 2. Construct a valid ITodoUser.ICreate request body including the email and a
 *    plain text password.
 * 3. Call the api.functional.todo.todoUsers.create function with the request.
 * 4. Validate that the response matches the ITodoUser type, including UUID and
 *    timestamp formats.
 * 5. Assert that the response email matches the request email.
 * 6. Confirm that created_at and updated_at timestamps are ISO 8601 formatted
 *    strings.
 * 7. Check that deleted_at is null or undefined, indicating an active account.
 * 8. Test for error when creating a user with a duplicate email address.
 *
 * This test ensures compliance with business constraints, unique email
 * enforcement, and proper data formatting.
 */
export async function test_api_todo_user_account_creation(
  connection: api.IConnection,
) {
  // 1. Generate unique email
  const email = typia.random<string & tags.Format<"email">>();

  // 2. Prepare request body for user creation
  const createRequest = {
    email: email,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoUser.ICreate;

  // 3. Create the todo user
  const createdUser = await api.functional.todo.todoUsers.create(connection, {
    body: createRequest,
  });

  // 4. Validate the response type
  typia.assert(createdUser);

  // 5. Check that email in response matches input
  TestValidator.equals(
    "created user email matches request",
    createdUser.email,
    email,
  );

  // 6. Verify created_at and updated_at are ISO date-time strings with length 24
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof createdUser.created_at === "string" &&
      createdUser.created_at.length === 24,
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    typeof createdUser.updated_at === "string" &&
      createdUser.updated_at.length === 24,
  );

  // 7. Confirm deleted_at is null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    createdUser.deleted_at === null || createdUser.deleted_at === undefined,
  );

  // 8. Try to create another user with the same email (expect error)
  await TestValidator.error("duplicate email should cause error", async () => {
    await api.functional.todo.todoUsers.create(connection, {
      body: {
        email: email,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ITodoUser.ICreate,
    });
  });
}
