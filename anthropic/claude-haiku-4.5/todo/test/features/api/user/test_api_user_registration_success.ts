import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validates successful user account registration with valid email and password.
 *
 * Tests the complete registration workflow where a new user provides valid
 * credentials and receives immediate authentication. The system validates email
 * format, password security requirements, creates the user account with active
 * status, and returns authenticated user information.
 *
 * Process:
 *
 * 1. Generate valid email and password meeting all requirements
 * 2. Call registration API with credentials
 * 3. Verify user was created with active status
 * 4. Confirm all required user properties are present and valid
 * 5. Validate user is immediately authenticated
 * 6. Confirm created_at and updated_at timestamps are properly recorded
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  // Generate valid test credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10); // 10 characters exceeds 8-char minimum

  // Register new user with valid credentials
  const registeredUser = await api.functional.todoApp.auth.register.create(
    connection,
    {
      body: {
        email: email,
        password: password,
      } satisfies ITodoAppUser.ICreate,
    },
  );

  // Validate response contains complete user object with all properties correctly typed
  typia.assert(registeredUser);

  // Verify business logic validations
  TestValidator.equals(
    "registered user email matches input email",
    registeredUser.email,
    email,
  );

  TestValidator.equals(
    "user account status is active upon registration",
    registeredUser.status,
    "active",
  );

  TestValidator.equals(
    "newly registered user has no deletion timestamp",
    registeredUser.deleted_at,
    null,
  );
}
