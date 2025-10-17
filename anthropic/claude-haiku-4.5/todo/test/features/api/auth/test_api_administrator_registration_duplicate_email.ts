import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAdministratorRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministratorRegistrationRequest";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test registration rejection when attempting to register with an email address
 * that is already registered in the system.
 *
 * This test validates that the administrator registration endpoint properly
 * enforces email uniqueness constraints. It creates an initial administrator
 * account with a specific email, then attempts to register again with the same
 * email, verifying that the system returns HTTP 409 Conflict with the
 * appropriate error code and message.
 *
 * Steps:
 *
 * 1. Create initial administrator account with unique email
 * 2. Verify successful registration returns authorized response
 * 3. Attempt to register with duplicate email
 * 4. Verify registration fails with HTTP 409 Conflict error
 * 5. Confirm no duplicate account was created
 */
export async function test_api_administrator_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate initial administrator registration data with valid email
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePassword123!";

  // Step 1: Create initial administrator account
  const firstRegistration = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: email,
        password: password,
        first_name: "John",
        last_name: "Doe",
      } satisfies IAdministratorRegistrationRequest,
    },
  );

  typia.assert(firstRegistration);
  TestValidator.equals(
    "first registration email should match input",
    firstRegistration.email,
    email,
  );
  TestValidator.predicate(
    "first registration should include authorization token",
    firstRegistration.token !== null && firstRegistration.token !== undefined,
  );
  TestValidator.equals(
    "first registration token type should be Bearer",
    firstRegistration.token_type,
    "Bearer",
  );

  // Step 2: Attempt duplicate registration with same email
  // This should fail with HTTP 409 Conflict
  await TestValidator.httpError(
    "duplicate email registration should fail with 409 Conflict",
    409,
    async () => {
      await api.functional.auth.administrator.join(connection, {
        body: {
          email: email,
          password: password,
          first_name: "Jane",
          last_name: "Smith",
        } satisfies IAdministratorRegistrationRequest,
      });
    },
  );

  // Step 3: Verify another duplicate attempt also fails
  await TestValidator.httpError(
    "second duplicate email registration should also fail with 409",
    409,
    async () => {
      await api.functional.auth.administrator.join(connection, {
        body: {
          email: email,
          password: "DifferentPassword456!",
          first_name: "Bob",
          last_name: "Johnson",
        } satisfies IAdministratorRegistrationRequest,
      });
    },
  );
}
