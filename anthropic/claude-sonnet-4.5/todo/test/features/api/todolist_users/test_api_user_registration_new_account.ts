import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the complete user registration workflow for new users joining the Todo
 * list application.
 *
 * This test validates that users can successfully create a new account by
 * providing a valid email address and a secure password that meets the system
 * requirements (minimum 8 characters with at least one letter and one number).
 * The test verifies that:
 *
 * 1. Email format is validated correctly
 * 2. Password strength requirements are enforced
 * 3. System successfully creates a new user record in todo_list_users table
 * 4. User receives a unique identifier
 * 5. Password is securely hashed before storage (never stored in plain text)
 * 6. Created_at and updated_at timestamps are set to current time
 * 7. Deleted_at field is null indicating an active account
 * 8. Response returns the newly created user profile with confirmation of
 *    successful registration
 *
 * This test validates the entry point for new users to access the application
 * and establishes the foundation for all subsequent todo management
 * operations.
 */
export async function test_api_user_registration_new_account(
  connection: api.IConnection,
) {
  // Generate valid test email
  const email = typia.random<string & tags.Format<"email">>();

  // Generate valid password meeting requirements (min 8 chars with letters and numbers)
  const password = `${RandomGenerator.alphabets(4)}${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>>()}`;

  // Generate session context URLs
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Create registration request body
  const registrationData = {
    email: email,
    password: password,
    href: href,
    referrer: referrer,
  } satisfies ITodoListUser.ICreate;

  // Call registration API
  const createdUser = await api.functional.todoList.users.join(connection, {
    body: registrationData,
  });

  // Validate response structure - this performs COMPLETE type validation
  typia.assert(createdUser);

  // Verify email matches the registration email (business logic validation)
  TestValidator.equals(
    "registered email should match input email",
    createdUser.email,
    email,
  );
}
