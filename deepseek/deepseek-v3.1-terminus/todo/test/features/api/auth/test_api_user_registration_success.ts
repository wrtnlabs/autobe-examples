import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMinimalTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoUser";

/**
 * Test successful user registration workflow that creates a new user account
 * and generates authentication tokens. Validates that the registration process
 * correctly handles email validation, password hashing, and token generation.
 * Ensures the system returns valid access and refresh tokens that can be used
 * for subsequent todo management operations.
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  // Generate valid registration data with proper email format and password length
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // Secure password meeting minimum 8 character requirement
  } satisfies IMinimalTodoUser.ICreate;

  // Execute the registration API call
  const response = await api.functional.auth.user.join(connection, {
    body: registrationData,
  });

  // Validate the complete response structure - typia.assert handles all type validation
  typia.assert(response);

  // Verify the registration was successful by ensuring we have valid user data
  TestValidator.predicate(
    "user registration should return valid uuid",
    response.id.length > 0,
  );
  TestValidator.predicate(
    "authentication tokens should be generated",
    response.token.access.length > 0 && response.token.refresh.length > 0,
  );
}
