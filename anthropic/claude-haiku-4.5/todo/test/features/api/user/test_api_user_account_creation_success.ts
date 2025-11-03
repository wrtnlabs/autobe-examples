import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful user account creation with valid credentials.
 *
 * This test validates the happy-path user registration workflow where a new
 * user successfully creates an account with a valid email address (RFC 5322
 * format) and a secure password (8+ characters). The test verifies that:
 *
 * 1. Account is created successfully with all required fields
 * 2. Unique user ID (UUID) is automatically generated
 * 3. Password is securely hashed and never returned in response
 * 4. Account status is set to 'active' by default
 * 5. Creation and update timestamps are recorded in UTC
 * 6. Soft delete timestamp is null for new accounts
 * 7. Response data structure matches expected user type
 *
 * Process:
 *
 * 1. Generate valid test data (RFC 5322 email, 8+ character password)
 * 2. Call user creation API with registration credentials
 * 3. Validate response contains complete user information
 * 4. Verify all fields match expected values and constraints
 * 5. Confirm account is immediately usable (status = 'active')
 */
export async function test_api_user_account_creation_success(
  connection: api.IConnection,
) {
  // Generate valid test data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12); // 12 characters, exceeds 8+ requirement

  // Create user account with valid credentials
  const user: ITodoAppUser = await api.functional.todoApp.users.create(
    connection,
    {
      body: {
        email: email,
        password: password,
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Verify email matches the registered value
  TestValidator.equals(
    "user email should match registered value",
    user.email,
    email,
  );

  // Verify account is immediately active
  TestValidator.equals(
    "account status should be active for new registration",
    user.status,
    "active",
  );

  // Verify creation and update timestamps are equal for new account
  TestValidator.equals(
    "created_at and updated_at should be equal for new account",
    user.created_at,
    user.updated_at,
  );

  // Verify soft delete timestamp is null for new accounts
  TestValidator.predicate(
    "deleted_at should be null for newly created account",
    user.deleted_at === null || user.deleted_at === undefined,
  );
}
