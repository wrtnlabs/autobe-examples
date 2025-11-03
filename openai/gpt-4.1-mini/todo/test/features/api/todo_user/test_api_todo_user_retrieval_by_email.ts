import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test scenario for creating a new todo user and retrieving their detail by
 * email.
 *
 * This test validates the entire workflow of user registration followed by
 * retrieval using the unique email address. It covers creation, authentication,
 * and data verification ensuring correctness and access control.
 *
 * Scenario steps:
 *
 * 1. Create a new todo user via the join API.
 * 2. Create the todo user record in the system.
 * 3. Retrieve the todo user details by their unique email through the get API.
 * 4. Validate retrieved user details against the created user data.
 *
 * This ensures the todo user creation and detail retrieval endpoints work
 * correctly and securely, and data integrity is maintained.
 */
export async function test_api_todo_user_retrieval_by_email(
  connection: api.IConnection,
) {
  // Step 1: Register user through join API and authenticate
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = RandomGenerator.alphaNumeric(15);

  const authorized: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: email,
        password: password,
      } satisfies ITodoUser.ICreate,
    },
  );
  typia.assert(authorized);

  // Step 2: Create todo user entry directly
  const createdUser: ITodoUser = await api.functional.todo.todoUsers.create(
    connection,
    {
      body: {
        email: email,
        password: password,
      } satisfies ITodoUser.ICreate,
    },
  );
  typia.assert(createdUser);

  // Step 3: Retrieve user detail by email
  const retrievedUser: ITodoUser = await api.functional.todo.user.todoUsers.at(
    connection,
    {
      todoUserEmail: email,
    },
  );
  typia.assert(retrievedUser);

  // Step 4: Validate retrieved data integrity matches the created user
  TestValidator.equals("user.id matches", retrievedUser.id, createdUser.id);
  TestValidator.equals(
    "user.email matches",
    retrievedUser.email,
    createdUser.email,
  );
  TestValidator.equals(
    "user.created_at matches",
    retrievedUser.created_at,
    createdUser.created_at,
  );
  TestValidator.equals(
    "user.updated_at matches",
    retrievedUser.updated_at,
    createdUser.updated_at,
  );

  // For deleted_at, accept either undefined or explicit null for active user
  TestValidator.predicate(
    "user.deleted_at is null or undefined",
    retrievedUser.deleted_at === null || retrievedUser.deleted_at === undefined,
  );
}
