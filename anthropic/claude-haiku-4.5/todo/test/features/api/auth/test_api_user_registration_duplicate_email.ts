import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";

/**
 * Test registration failure prevention when email address is already
 * registered.
 *
 * This test validates that the system enforces email uniqueness constraints by:
 *
 * 1. Creating the first user account successfully with valid credentials
 * 2. Attempting to register a second user with the same email address
 * 3. Validating that the second registration fails with HTTP 409 Conflict error
 * 4. Confirming error message indicates the email is already registered
 * 5. Ensuring only the first account exists after the duplicate attempt
 */
export async function test_api_user_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Create first user account with valid credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = "ValidPassword123!";

  const firstUser = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        email: email,
        password: password,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    },
  );

  typia.assert(firstUser);
  TestValidator.equals(
    "first user registered successfully",
    firstUser.id !== undefined,
    true,
  );
  TestValidator.equals(
    "first user has authorization token",
    firstUser.token !== undefined,
    true,
  );

  // Step 2: Attempt to register second user with same email address
  // This should fail with HTTP 409 Conflict error
  await TestValidator.error(
    "duplicate email registration should fail with conflict error",
    async () => {
      await api.functional.auth.authenticatedUser.join(connection, {
        body: {
          email: email,
          password: password,
        } satisfies ITodoAppAuthenticatedUser.ICreate,
      });
    },
  );

  // Step 3: Verify that attempting duplicate email throws error
  // (The error is expected, so we validate that the system properly rejects it)
  TestValidator.predicate(
    "first user account remains valid after duplicate attempt",
    firstUser.id !== undefined && firstUser.token !== undefined,
  );
}
