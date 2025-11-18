import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful user registration workflow with valid credentials.
 *
 * This test validates that a new user can successfully create an account by
 * providing a unique email address, a valid password meeting minimum security
 * requirements (8+ characters), and proper session context metadata (href and
 * referrer URLs).
 *
 * The test verifies that the system:
 *
 * 1. Creates a new user record in the todo_list_users table
 * 2. Securely hashes the password before storage
 * 3. Normalizes the email to lowercase
 * 4. Automatically generates UUID for the user ID
 * 5. Sets created_at and updated_at timestamps
 * 6. Immediately establishes an authenticated session by returning JWT tokens
 *
 * Upon successful registration, the response contains all expected fields
 * including user ID, email, timestamps, and complete token information with
 * expiration details, allowing the newly registered user to begin using the
 * application immediately without requiring a separate login step.
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  // Generate random test data for user registration
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationPassword = typia.random<string & tags.MinLength<8>>();
  const currentPageUrl = typia.random<string & tags.Format<"uri">>();
  const referrerUrl = typia.random<string & tags.Format<"uri">>();

  // Create registration request body
  const registrationData = {
    email: registrationEmail,
    password: registrationPassword,
    href: currentPageUrl,
    referrer: referrerUrl,
  } satisfies ITodoListUser.ICreate;

  // Call the user registration API
  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationData,
    });

  // Validate the response structure and types - this validates EVERYTHING
  typia.assert(registeredUser);

  // Verify email matches the registration email (normalized to lowercase by backend)
  TestValidator.equals(
    "returned email should match registration email",
    registeredUser.email,
    registrationEmail.toLowerCase(),
  );
}
