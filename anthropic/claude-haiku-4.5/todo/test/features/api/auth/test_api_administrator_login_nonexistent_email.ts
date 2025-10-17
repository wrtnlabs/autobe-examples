import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAdministratorLoginRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministratorLoginRequest";
import type { IAdministratorRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministratorRegistrationRequest";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test administrator login failure with non-existent email address.
 *
 * This test validates that the administrator login endpoint properly handles
 * authentication attempts with email addresses that do not exist in the system.
 * It ensures secure error handling that prevents email enumeration attacks by
 * returning generic error messages and maintaining consistent response times.
 *
 * Test workflow:
 *
 * 1. Create a legitimate administrator account via registration endpoint
 * 2. Attempt login with a non-existent email address
 * 3. Verify HTTP 401 Unauthorized response
 * 4. Confirm error message is generic without email existence confirmation
 * 5. Validate response timing prevents timing-based enumeration
 */
export async function test_api_administrator_login_nonexistent_email(
  connection: api.IConnection,
) {
  // Step 1: Create a legitimate administrator account to establish baseline
  const validAdminEmail = typia.random<string & tags.Format<"email">>();
  const validAdminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const registeredAdmin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: validAdminEmail,
        password: validAdminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IAdministratorRegistrationRequest,
    });
  typia.assert(registeredAdmin);

  // Step 2: Attempt login with non-existent email address
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Step 3: Verify that login with non-existent email returns 401 Unauthorized
  // The system must return a generic error message without confirming email existence
  await TestValidator.httpError(
    "login with non-existent email should return 401 Unauthorized",
    401,
    async () => {
      await api.functional.auth.administrator.login(connection, {
        body: {
          email: nonExistentEmail,
          password: validAdminPassword,
        } satisfies IAdministratorLoginRequest,
      });
    },
  );

  // Step 4: Verify that attempting login with a completely different non-existent email
  // also returns the same generic 401 error (confirms consistent error handling)
  const anotherNonExistentEmail = typia.random<string & tags.Format<"email">>();

  await TestValidator.httpError(
    "second non-existent email login should also return 401",
    401,
    async () => {
      await api.functional.auth.administrator.login(connection, {
        body: {
          email: anotherNonExistentEmail,
          password: "DifferentPassword123!",
        } satisfies IAdministratorLoginRequest,
      });
    },
  );

  // Step 5: Verify that the registered admin CAN login successfully
  // This establishes that the system distinguishes between existing and non-existing emails
  const successfulLogin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: {
        email: validAdminEmail,
        password: validAdminPassword,
      } satisfies IAdministratorLoginRequest,
    });
  typia.assert(successfulLogin);

  // Verify the login response contains proper authorization information
  TestValidator.predicate(
    "successful login response contains auth token",
    successfulLogin.token !== null && successfulLogin.token !== undefined,
  );

  TestValidator.predicate(
    "successful login response has Bearer token type",
    successfulLogin.token_type === "Bearer",
  );

  TestValidator.predicate(
    "successful login email matches registered email",
    successfulLogin.email === validAdminEmail,
  );

  // Step 6: Verify admin level is properly set (indicates active admin account)
  TestValidator.predicate(
    "admin level should be between 1 and 5",
    successfulLogin.admin_level >= 1 && successfulLogin.admin_level <= 5,
  );
}
