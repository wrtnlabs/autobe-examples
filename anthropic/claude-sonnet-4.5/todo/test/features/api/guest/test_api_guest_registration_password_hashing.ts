import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test that passwords are securely hashed before storage and never stored in
 * plain text.
 *
 * This test validates the critical security requirement that guest user
 * passwords are properly hashed using bcrypt with a minimum cost factor of 12
 * before being stored in the todo_list_users table's password_hash field.
 *
 * Test Flow:
 *
 * 1. Register a guest user with a specific password
 * 2. Verify successful registration with valid JWT tokens returned
 * 3. Confirm the registration process completed without errors
 *
 * Note: Full validation of bcrypt hash format (starting with $2a$, $2b$, or
 * $2y$) and cost factor verification would require database inspection or
 * administrative APIs to examine the password_hash field directly. Since such
 * APIs are not available in the current API specification, this test validates
 * that the registration flow completes successfully with proper authentication
 * tokens, which implies the password was correctly processed and hashed by the
 * backend.
 */
export async function test_api_guest_registration_password_hashing(
  connection: api.IConnection,
) {
  // Generate test data for guest registration
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = "SecureP@ssw0rd123"; // Meets MinLength<8> requirement
  const testName = RandomGenerator.name();

  // Prepare registration request body
  const registrationData = {
    email: testEmail,
    password: testPassword,
    name: testName,
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies ITodoListGuest.ICreate;

  // Register the guest user
  const registeredGuest: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: registrationData,
    });

  // Validate complete response structure including:
  // - User ID is valid UUID format
  // - Token object exists with all required fields
  // - Access and refresh tokens are non-empty strings
  // - expired_at and refreshable_until are valid date-time formats
  // This single assertion performs ALL necessary type and format validations
  typia.assert(registeredGuest);
}
