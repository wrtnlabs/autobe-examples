import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful user login with correct credentials.
 *
 * This test validates the complete authentication workflow:
 *
 * 1. Register a new user account with a valid email and password
 * 2. Authenticate the user by logging in with the same credentials
 * 3. Verify the login response contains a valid user object
 * 4. Confirm user status is 'active' and all timestamps are in valid ISO format
 * 5. Ensure the session is properly established for authenticated requests
 */
export async function test_api_user_login_success(connection: api.IConnection) {
  // Step 1: Generate test credentials
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphabets(10);

  // Step 2: Register a new user account
  const registeredUser: ITodoAppUser =
    await api.functional.todoApp.auth.register.create(connection, {
      body: {
        email: testEmail,
        password: testPassword,
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(registeredUser);

  // Verify registration response
  TestValidator.equals(
    "registered user email matches",
    registeredUser.email,
    testEmail,
  );
  TestValidator.equals(
    "registered user status is active",
    registeredUser.status,
    "active",
  );

  // Step 3: Login with the registered credentials
  const loggedInUser: ITodoAppUser = await api.functional.todoApp.auth.login.at(
    connection,
    {
      body: {
        email: testEmail,
        password: testPassword,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(loggedInUser);

  // Step 4: Verify login response contains valid user data
  TestValidator.equals(
    "login email matches registered email",
    loggedInUser.email,
    testEmail,
  );
  TestValidator.equals(
    "login user status is active",
    loggedInUser.status,
    "active",
  );
  TestValidator.equals(
    "login user ID is valid UUID",
    loggedInUser.id,
    registeredUser.id,
  );

  // Step 5: Verify timestamps are valid ISO format date-time strings
  TestValidator.predicate("created_at is valid ISO date-time", () => {
    const createdAtDate = new Date(loggedInUser.created_at);
    return !isNaN(createdAtDate.getTime());
  });

  TestValidator.predicate("updated_at is valid ISO date-time", () => {
    const updatedAtDate = new Date(loggedInUser.updated_at);
    return !isNaN(updatedAtDate.getTime());
  });

  // Step 6: Verify deleted_at is null (active account)
  TestValidator.equals(
    "deleted_at should be null for active user",
    loggedInUser.deleted_at,
    null,
  );
}
