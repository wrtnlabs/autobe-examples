import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user registration with duplicate email address.
 *
 * This test validates that the system properly prevents duplicate user
 * registrations by detecting when the same email address is used for multiple
 * accounts. The test follows a clear workflow: first creating a valid user
 * account, then attempting to register another account with the same email
 * address, and finally verifying that the system rejects the duplicate
 * registration attempt.
 *
 * The test ensures that the authentication system maintains data integrity by
 * enforcing unique email constraints, which is crucial for user account
 * management and security in the todo list application.
 */
export async function test_api_user_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate a unique email address for testing
  const testEmail = typia.random<string & tags.Format<"email">>();

  // Step 1: Create initial user account successfully
  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: testEmail,
      password: "TestPassword123",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(firstUser);

  // Validate that the first user was created successfully
  TestValidator.equals(
    "first user email matches input",
    firstUser.email,
    testEmail,
  );
  TestValidator.predicate(
    "first user has valid token",
    firstUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "first user has valid refresh token",
    firstUser.token.refresh.length > 0,
  );

  // Step 2: Attempt to register another account with the same email
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      return await api.functional.auth.user.join(connection, {
        body: {
          email: testEmail,
          password: "DifferentPassword456",
        } satisfies ITodoListUser.ICreate,
      });
    },
  );
}
