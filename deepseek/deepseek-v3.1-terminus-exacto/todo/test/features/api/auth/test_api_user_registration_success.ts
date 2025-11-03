import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful user registration workflow for the Todo application.
 *
 * This test validates that new users can create accounts with valid email and
 * password credentials. It verifies that the registration process creates a
 * user record with proper email validation, password hashing, and generates
 * authentication tokens for immediate access. The test confirms that the user
 * account is set to 'active' status and includes proper timestamps for audit
 * purposes.
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  // Generate valid test data for user registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  // Register a new user account
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email,
        password,
      } satisfies ITodoAppUser.ICreate,
    },
  );

  // Validate the response structure and data integrity
  typia.assert(user);

  // Verify user account details - business logic validation only
  TestValidator.equals("user email matches input", user.email, email);
  TestValidator.equals("user status is active", user.status, "active");

  // Validate token structure using typia.assert for complete validation
  typia.assert<IAuthorizationToken>(user.token);

  // Verify connection headers are updated with access token
  TestValidator.predicate(
    "connection headers include authorization token",
    connection.headers?.Authorization === user.token.access,
  );
}
