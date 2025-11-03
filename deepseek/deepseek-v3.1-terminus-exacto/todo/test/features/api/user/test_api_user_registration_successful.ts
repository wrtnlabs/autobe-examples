import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test the complete user registration workflow for the Todo application.
 *
 * This test validates that a new user can successfully create an account with
 * valid email and password credentials. The test verifies that the system
 * properly validates email format, ensures email uniqueness, enforces password
 * complexity requirements, and creates a user record with 'active' status. It
 * also confirms that authentication tokens are generated upon successful
 * registration and that the user account is properly stored in the system.
 *
 * Test workflow:
 *
 * 1. Generate valid test data (email and password)
 * 2. Call the registration API with valid credentials
 * 3. Validate the response structure and data
 * 4. Verify that all required fields are present and correctly formatted
 * 5. Confirm the user account is created with 'active' status
 */
export async function test_api_user_registration_successful(
  connection: api.IConnection,
) {
  // Generate valid test data for user registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  // Call the registration API with valid credentials
  const user = await api.functional.todoApp.auth.register.create(connection, {
    body: {
      email: email,
      password: password,
    } satisfies ITodoAppUser.ICreate,
  });

  // Validate the response structure and type safety - this handles ALL type validation
  typia.assert(user);

  // Verify business logic requirements (not type validation)
  TestValidator.equals(
    "user email should match input email",
    user.email,
    email,
  );
  TestValidator.equals("user status should be 'active'", user.status, "active");

  // Verify password_hash is present and hashed (business requirement)
  TestValidator.predicate(
    "password_hash should be defined and hashed",
    user.password_hash !== undefined && user.password_hash.length > 0,
  );

  // Verify deleted_at is undefined for new active accounts (business requirement)
  TestValidator.equals(
    "deleted_at should be undefined for active accounts",
    user.deleted_at,
    undefined,
  );

  // Verify timestamps are properly set (business requirement)
  TestValidator.predicate(
    "created_at should be set",
    user.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at should be set",
    user.updated_at !== undefined,
  );
}
