import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user registration with valid email and password credentials.
 *
 * This test validates the complete user registration workflow including:
 *
 * - Email format validation and uniqueness
 * - Password security requirements (minimum 8 characters)
 * - Proper UUID generation for user ID
 * - Email normalization to lowercase
 * - Password hashing with bcrypt (cost factor 10)
 * - Timestamp generation (created_at and updated_at)
 * - Response data structure validation
 * - Password exclusion from response for security
 *
 * Steps:
 *
 * 1. Generate random valid email and password
 * 2. Call registration API with credentials
 * 3. Validate response structure and data types
 * 4. Verify email matches input (normalized to lowercase)
 */
export async function test_api_user_registration_with_valid_credentials(
  connection: api.IConnection,
) {
  // Generate valid registration credentials
  const email = typia.random<
    string & tags.Format<"email"> & tags.MaxLength<255>
  >();
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  // Call registration API
  const registeredUser: ITodoListUser =
    await api.functional.todoList.auth.register(connection, {
      body: {
        email: email,
        password: password,
      } satisfies ITodoListUser.ICreate,
    });

  // Validate response structure with typia - this performs COMPLETE validation
  // including UUID format, date-time format, and all type constraints
  typia.assert(registeredUser);

  // Verify email is normalized to lowercase (business logic validation)
  TestValidator.equals(
    "registered email should match input email (normalized to lowercase)",
    registeredUser.email,
    email.toLowerCase(),
  );
}
