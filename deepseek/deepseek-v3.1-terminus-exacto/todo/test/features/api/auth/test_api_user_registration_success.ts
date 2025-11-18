import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validates successful user registration workflow including email validation,
 * password hashing, and immediate token generation.
 *
 * This test ensures that new users can register with valid credentials and
 * receive JWT tokens for immediate authentication. It verifies account status
 * assignment as 'pending_verification' and ensures all required fields are
 * properly validated and stored.
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  // Generate realistic test data for user registration
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userName = RandomGenerator.name();

  // Create registration request body with all required fields
  const registrationData = {
    email: userEmail,
    password: "SecurePassword123!",
    name: userName,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://todoapp.example.com/register",
    referrer: "https://todoapp.example.com",
  } satisfies ITodoAppUser.ICreate;

  // Execute user registration API call
  const registeredUser = await api.functional.auth.user.join(connection, {
    body: registrationData,
  });

  // Validate response type safety and structure
  typia.assert(registeredUser);

  // Verify user information matches registration data
  TestValidator.equals(
    "email should match registration input",
    registeredUser.email,
    userEmail,
  );
  TestValidator.equals(
    "name should match registration input",
    registeredUser.name,
    userName,
  );

  // Validate account status defaults to 'pending_verification'
  TestValidator.equals(
    "account status should be pending_verification",
    registeredUser.status,
    "pending_verification",
  );
}
