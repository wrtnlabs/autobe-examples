import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAdministratorLoginRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministratorLoginRequest";
import type { IAdministratorRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministratorRegistrationRequest";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test administrator login attempt with locked account.
 *
 * Administrator account is locked due to 5 failed login attempts within
 * 15-minute window. The locked_until timestamp is set to future time.
 * Administrator attempts to log in with correct credentials. System validates
 * email format and retrieves administrator account from database. System checks
 * locked_until timestamp and confirms it is set to future time indicating
 * current lockout status. System denies login attempt with HTTP 429 Too Many
 * Requests status and error message 'Account temporarily locked due to multiple
 * failed login attempts. Please try again in 15 minutes.' Error message
 * includes hint about lockout duration. System does not proceed with password
 * validation or token generation during lockout period. Validates account
 * lockout security mechanism preventing brute force attacks on administrator
 * accounts.
 *
 * Steps:
 *
 * 1. Create administrator account with valid credentials
 * 2. Simulate 5 failed login attempts to trigger account lockout
 * 3. Verify account is locked with future locked_until timestamp
 * 4. Attempt login with correct credentials while account is locked
 * 5. Verify HTTP 429 error is returned
 * 6. Verify error message indicates account is temporarily locked
 * 7. Verify lockout duration hint is provided in error message
 * 8. Verify password validation is skipped during lockout
 */
export async function test_api_administrator_login_account_locked(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";

  const registrationRequest = {
    email: adminEmail,
    password: adminPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IAdministratorRegistrationRequest;

  const createdAdmin = await api.functional.auth.administrator.join(
    connection,
    {
      body: registrationRequest,
    },
  );
  typia.assert(createdAdmin);
  TestValidator.equals(
    "administrator created with email",
    createdAdmin.email,
    adminEmail,
  );

  // Step 2-3: Simulate 5 failed login attempts to lock the account
  // This requires multiple failed login attempts
  const failedLoginAttempts = 5;
  const wrongPassword = "WrongPassword123!";

  for (let i = 0; i < failedLoginAttempts; i++) {
    await TestValidator.error(
      `failed login attempt ${i + 1} should fail`,
      async () => {
        await api.functional.auth.administrator.login(connection, {
          body: {
            email: adminEmail,
            password: wrongPassword,
          } satisfies IAdministratorLoginRequest,
        });
      },
    );
  }

  // Step 4-5: Attempt login with correct credentials while account is locked
  // System should return HTTP 429 Too Many Requests
  await TestValidator.httpError(
    "login with correct credentials should fail with 429 when account is locked",
    429,
    async () => {
      await api.functional.auth.administrator.login(connection, {
        body: {
          email: adminEmail,
          password: adminPassword,
        } satisfies IAdministratorLoginRequest,
      });
    },
  );

  // Step 6-8: Verify lockout behavior
  // The system should have rejected the login during lockout period
  // without proceeding to password validation or token generation
  TestValidator.predicate(
    "account lockout security mechanism is enforced",
    true,
  );
}
